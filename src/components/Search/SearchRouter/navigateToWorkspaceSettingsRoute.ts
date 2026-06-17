import Navigation from '@libs/Navigation/Navigation';
import ROUTES from '@src/ROUTES';
import type {Route} from '@src/ROUTES';

const WORKSPACE_ROUTE_PATTERN = /^\/?workspaces\/[^/]+(\/.*)?$/;

function getWorkspaceRouteSuffix(route: string): string | undefined {
    const normalizedRoute = route.replace(/\?.*$/, '').replace(/^\//, '');
    const match = normalizedRoute.match(/^workspaces\/[^/]+(\/.*)?$/);
    return match?.[1] ?? '';
}

function navigateToWorkspaceSettingsRoute(targetRoute: Route, policyID: string, shouldUseNarrowLayout: boolean) {
    if (shouldUseNarrowLayout) {
        Navigation.navigate(targetRoute);
        return;
    }

    const activeRoute = Navigation.getActiveRouteWithoutParams();
    const currentSuffix = getWorkspaceRouteSuffix(activeRoute);
    const targetSuffix = getWorkspaceRouteSuffix(targetRoute);
    const isSameWorkspaceSettingsScreen = !!currentSuffix && currentSuffix === targetSuffix && activeRoute !== targetRoute && WORKSPACE_ROUTE_PATTERN.test(activeRoute);

    if (!isSameWorkspaceSettingsScreen || targetSuffix === undefined) {
        Navigation.navigate(targetRoute);
        return;
    }

    Navigation.navigate(ROUTES.WORKSPACE_INITIAL.getRoute(policyID));
    Navigation.setNavigationActionToMicrotaskQueue(() => {
        Navigation.navigate(targetRoute, {forceReplace: true});
    });
}

export default navigateToWorkspaceSettingsRoute;
