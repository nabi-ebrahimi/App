import {act, render, waitFor} from '@testing-library/react-native';

import GPSMapView from '@components/MapView/GPSMapView';
import type {GPSMapViewProps, WayPoint} from '@components/MapView/MapViewTypes';

import useOnyx from '@hooks/useOnyx';

import CONST from '@src/CONST';

import {getForegroundPermissionsAsync} from 'expo-location';
import React from 'react';

type CameraProps = {
    bounds?: {ne: [number, number]; sw: [number, number]};
    centerCoordinate?: [number, number];
    defaultSettings?: {
        bounds?: {ne: [number, number]; sw: [number, number]};
        centerCoordinate?: [number, number];
        zoomLevel?: number;
    };
    followUserLocation?: boolean;
};

type MapViewProps = {
    onDidFinishLoadingStyle?: () => void;
    onTouchStart?: () => void;
};

type UserLocationProps = {
    onUpdate?: (location: {coords: {latitude: number; longitude: number}}) => void;
};

const mockCameraProps = {current: undefined as CameraProps | undefined};
const mockMapViewProps = {current: undefined as MapViewProps | undefined};
const mockUserLocationProps = {current: undefined as UserLocationProps | undefined};
let mockCameraMountCount = 0;
let mockCameraUnmountCount = 0;
let mockIsOffline = false;
let mockUserLocation: {latitude: number; longitude: number} | undefined;

jest.mock('@rnmapbox/maps', () => {
    const ReactActual = jest.requireActual<typeof React>('react');

    function MapView({children, ...props}: React.PropsWithChildren<MapViewProps>) {
        mockMapViewProps.current = props;
        return ReactActual.createElement(ReactActual.Fragment, null, children);
    }

    const Camera = ReactActual.forwardRef((_props: CameraProps, _ref) => {
        mockCameraProps.current = _props;
        ReactActual.useEffect(() => {
            mockCameraMountCount += 1;
            return () => {
                mockCameraUnmountCount += 1;
            };
        }, []);
        return null;
    });

    function UserLocation(props: UserLocationProps) {
        mockUserLocationProps.current = props;
        return null;
    }

    const Container = ({children}: React.PropsWithChildren) => ReactActual.createElement(ReactActual.Fragment, null, children);

    return {
        __esModule: true,
        default: {
            Camera,
            Image: () => null,
            Images: Container,
            LocationPuck: () => null,
            MapView,
            UserLocation,
            Viewport: () => null,
        },
        MarkerView: Container,
    };
});

jest.mock('@react-navigation/native', () => {
    const ReactActual = jest.requireActual<typeof React>('react');
    return {
        useFocusEffect: (callback: () => undefined | (() => void)) => ReactActual.useEffect(callback, []),
    };
});
jest.mock('expo-location', () => ({getForegroundPermissionsAsync: jest.fn(() => Promise.resolve({granted: true}))}));
jest.mock('@components/ButtonComposed', () => {
    const ReactActual = jest.requireActual<typeof React>('react');
    const Button = ({children}: React.PropsWithChildren) => ReactActual.createElement(ReactActual.Fragment, null, children);
    Button.Icon = () => null;
    return Button;
});
jest.mock('@components/ImageSVG', () => () => null);
jest.mock('@components/MapView/Compass', () => () => null);
jest.mock('@components/MapView/GPSDirection', () => () => null);
jest.mock('@components/MapView/GPSWaypointLayer', () => () => null);
jest.mock('@components/MapView/LayerOrderAnchors', () => () => null);
jest.mock('@components/MapView/PendingMapView', () => () => null);
jest.mock('@components/MapView/responder', () => ({panHandlers: {}}));
jest.mock('@components/MapView/useAccessToken', () => () => true);
jest.mock('@hooks/useAppFocusEvent', () => jest.fn());
jest.mock('@hooks/useLazyAsset', () => ({useMemoizedLazyExpensifyIcons: () => ({Crosshair: '', MapCurrentLocation: '', MapCurrentLocationPuck: ''})}));
jest.mock('@hooks/useNetwork', () => () => ({isOffline: mockIsOffline}));
jest.mock('@hooks/useOnyx', () => jest.fn(() => [mockUserLocation]));
jest.mock('@hooks/useTheme', () => () => ({icon: ''}));
jest.mock('@hooks/useThemeStyles', () => () => ({}));
jest.mock('@src/hooks/useLocalize', () => () => ({translate: (key: string) => key}));
jest.mock('react-native-reanimated', () => ({useSharedValue: () => ({set: jest.fn()})}));

const mockedGetForegroundPermissionsAsync = jest.mocked(getForegroundPermissionsAsync);
const mockedUseOnyx = jest.mocked(useOnyx);

const BASE_PROPS: GPSMapViewProps = {
    accessToken: 'mapbox-token',
    directionCoordinates: [],
    isTrackingGPS: true,
    style: {},
};

const WAYPOINTS = [
    {id: 'start', coordinate: [-122.5, 37.5]},
    {id: 'end', coordinate: [-122.1, 37.9]},
] as WayPoint[];

async function renderMap(props: Partial<GPSMapViewProps> = {}) {
    const result = render(
        <GPSMapView
            {...BASE_PROPS}
            {...props}
        />,
    );
    await waitFor(() => expect(mockCameraProps.current).toBeDefined());
    return result;
}

function sendStyleReady() {
    act(() => mockMapViewProps.current?.onDidFinishLoadingStyle?.());
}

function sendLocation(latitude = 37.7, longitude = -122.3) {
    act(() => mockUserLocationProps.current?.onUpdate?.({coords: {latitude, longitude}}));
}

describe('GPSMapView camera readiness', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockCameraProps.current = undefined;
        mockMapViewProps.current = undefined;
        mockUserLocationProps.current = undefined;
        mockCameraMountCount = 0;
        mockCameraUnmountCount = 0;
        mockIsOffline = false;
        mockUserLocation = {latitude: 37.8, longitude: -122.4};
        (mockedUseOnyx as jest.Mock).mockImplementation(() => [mockUserLocation]);
        mockedGetForegroundPermissionsAsync.mockResolvedValue({granted: true} as Awaited<ReturnType<typeof getForegroundPermissionsAsync>>);
    });

    it('uses a cached location without following until the style and native location are ready', async () => {
        await renderMap();

        expect(mockCameraProps.current).toMatchObject({
            centerCoordinate: [-122.4, 37.8],
            defaultSettings: {
                centerCoordinate: [-122.4, 37.8],
                zoomLevel: CONST.MAPBOX.DEFAULT_ZOOM,
            },
            followUserLocation: false,
        });

        sendLocation();
        expect(mockCameraProps.current?.followUserLocation).toBe(false);

        sendStyleReady();
        expect(mockCameraProps.current?.followUserLocation).toBe(true);
        expect(mockCameraProps.current?.centerCoordinate).toBeUndefined();
    });

    it('does not follow when only the style is ready', async () => {
        await renderMap();

        sendStyleReady();

        expect(mockCameraProps.current?.followUserLocation).toBe(false);
        expect(mockCameraProps.current?.centerCoordinate).toEqual([-122.4, 37.8]);
    });

    it('uses the default coordinate when no cached location is available', async () => {
        mockUserLocation = undefined;
        await renderMap();

        expect(mockCameraProps.current?.centerCoordinate).toEqual(CONST.MAPBOX.DEFAULT_COORDINATE);
        expect(mockCameraProps.current?.defaultSettings?.centerCoordinate).toEqual(CONST.MAPBOX.DEFAULT_COORDINATE);
    });

    it('frames trip bounds and keeps stopped trips from following', async () => {
        await renderMap({isTrackingGPS: false, waypoints: WAYPOINTS});

        const expectedBounds = {ne: [-122.1, 37.9], sw: [-122.5, 37.5]};
        expect(mockCameraProps.current?.bounds).toMatchObject(expectedBounds);
        expect(mockCameraProps.current?.defaultSettings?.bounds).toEqual(expectedBounds);

        sendStyleReady();
        sendLocation();

        expect(mockCameraProps.current?.followUserLocation).toBe(false);
    });

    it('does not resume following after the user interacts with the map', async () => {
        await renderMap({waypoints: WAYPOINTS});
        sendStyleReady();
        sendLocation();
        expect(mockCameraProps.current?.followUserLocation).toBe(true);

        act(() => mockMapViewProps.current?.onTouchStart?.());

        expect(mockCameraProps.current?.followUserLocation).toBe(false);
        expect(mockCameraProps.current?.bounds).toBeUndefined();
    });

    it('creates fresh readiness state when the native map is reconstructed', async () => {
        const {rerender} = await renderMap();
        sendStyleReady();
        sendLocation();
        expect(mockCameraProps.current?.followUserLocation).toBe(true);

        mockIsOffline = true;
        rerender(<GPSMapView {...BASE_PROPS} />);
        expect(mockCameraUnmountCount).toBe(1);

        mockCameraProps.current = undefined;
        mockIsOffline = false;
        rerender(<GPSMapView {...BASE_PROPS} />);

        await waitFor(() => expect(mockCameraProps.current).toBeDefined());
        expect(mockCameraMountCount).toBe(2);
        expect(mockCameraProps.current?.followUserLocation).toBe(false);
    });
});
