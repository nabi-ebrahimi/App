import {getCurrentAddress, getStreetLines} from '@libs/PersonalDetailsUtils';
import {doesContainReservedWord, getInvalidAddressErrorTranslationPath, isValidLegalName, isValidZipCode} from '@libs/ValidationUtils';

import CONST from '@src/CONST';
import type {WalletAdditionalDetailsForm} from '@src/types/form';
import INPUT_IDS from '@src/types/form/WalletAdditionalDetailsForm';
import type {PersonalInfoStepProps} from '@src/types/form/WalletAdditionalDetailsForm';
import type {PrivatePersonalDetails} from '@src/types/onyx';
import type {WalletAdditionalDetailsRefactor} from '@src/types/onyx/WalletAdditionalDetails';

import type {OnyxEntry} from 'react-native-onyx';

import getSubstepValues from './getSubstepValues';

const BANK_ACCOUNT_PAGES = CONST.ENABLE_PAYMENTS.ADD_BANK_ACCOUNT_STEP.SUB_PAGE_NAMES;
const PERSONAL_INFO_STEP_KEYS = INPUT_IDS.PERSONAL_INFO_STEP;

type OwnerDetailPageName = typeof BANK_ACCOUNT_PAGES.LEGAL_NAME | typeof BANK_ACCOUNT_PAGES.ADDRESS;

type WalletOwnerFieldValues = Partial<Pick<PersonalInfoStepProps, 'legalFirstName' | 'legalLastName' | 'addressStreet' | 'addressCity' | 'addressState' | 'addressZipCode'>>;

type BankAccountOwnerSources = {
    walletAdditionalDetailsDraft?: WalletOwnerFieldValues | null;
    walletAdditionalDetails?: Partial<WalletAdditionalDetailsRefactor> | null;
    privatePersonalDetails?: OnyxEntry<PrivatePersonalDetails>;
};

type BankAccountOwnerDetails = {
    legalFirstName: string;
    legalLastName: string;
    addressStreet: string;
    addressStreet2: string;
    addressCity: string;
    addressState: string;
    addressZipCode: string;
    displayStreet: string;
    country: typeof CONST.COUNTRY.US | '';
    hasLegalName: boolean;
    hasAddress: boolean;
};

type OwnerAddressValues = {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    street2?: string;
};

function normalizeValue(value?: string): string {
    return value?.trim() ?? '';
}

/**
 * Draft values are intentional, including an empty value that a user explicitly cleared.
 * Do not silently replace a cleared wallet field with an older profile value.
 */
function getDraftOrFallback(draftValue: string | undefined, walletValue: string | undefined, profileValue: string | undefined): string {
    if (draftValue !== undefined) {
        return normalizeValue(draftValue);
    }

    if (normalizeValue(walletValue)) {
        return normalizeValue(walletValue);
    }

    return normalizeValue(profileValue);
}

/**
 * Resolves the data that will be attached to a US Wallet bank account.
 * Address fields come from one source at a time so a partial or non-US profile address cannot be combined with Wallet data.
 */
function getBankAccountOwnerDetails({walletAdditionalDetailsDraft, walletAdditionalDetails, privatePersonalDetails}: BankAccountOwnerSources): BankAccountOwnerDetails {
    const legalFirstName = getDraftOrFallback(walletAdditionalDetailsDraft?.legalFirstName, walletAdditionalDetails?.legalFirstName, privatePersonalDetails?.legalFirstName);
    const legalLastName = getDraftOrFallback(walletAdditionalDetailsDraft?.legalLastName, walletAdditionalDetails?.legalLastName, privatePersonalDetails?.legalLastName);

    const profileAddress = getCurrentAddress(privatePersonalDetails);
    const isEligibleUSProfileAddress = !profileAddress?.country || profileAddress.country === CONST.COUNTRY.US;
    const [profileStreet, profileStreetFromNewLine] = getStreetLines(profileAddress?.street ?? '');
    const profileStreet2 = normalizeValue(profileStreetFromNewLine) || normalizeValue(profileAddress?.street2) || normalizeValue(profileAddress?.addressLine2);
    const profileZip = profileAddress?.zip ?? profileAddress?.zipCode ?? profileAddress?.zipPostCode;

    const draftAddress: OwnerAddressValues = {
        street: walletAdditionalDetailsDraft?.addressStreet,
        city: walletAdditionalDetailsDraft?.addressCity,
        state: walletAdditionalDetailsDraft?.addressState,
        zipCode: walletAdditionalDetailsDraft?.addressZipCode,
    };
    const walletAddress: OwnerAddressValues = {
        street: walletAdditionalDetails?.addressStreet,
        city: walletAdditionalDetails?.addressCity,
        state: walletAdditionalDetails?.addressState,
        zipCode: walletAdditionalDetails?.addressZipCode,
    };
    const profileAddressValues: OwnerAddressValues | undefined = isEligibleUSProfileAddress
        ? {
              street: profileStreet,
              street2: profileStreet2,
              city: profileAddress?.city,
              state: profileAddress?.state,
              zipCode: profileZip,
          }
        : undefined;
    const hasDraftAddress = Object.values(draftAddress).some((value) => value !== undefined);
    const hasWalletAddress = Object.values(walletAddress).some((value) => !!normalizeValue(value));
    const addressSource = hasDraftAddress ? draftAddress : hasWalletAddress ? walletAddress : profileAddressValues;
    const sourceStreet = addressSource?.street;
    const [addressStreet, addressStreet2FromNewLine] = getStreetLines(sourceStreet ?? '');
    const addressStreet2 = normalizeValue(addressStreet2FromNewLine) || normalizeValue(addressSource?.street2);
    const addressCity = normalizeValue(addressSource?.city);
    const addressState = normalizeValue(addressSource?.state);
    const addressZipCode = normalizeValue(addressSource?.zipCode);
    const normalizedStreet = normalizeValue(addressStreet);
    const hasAddress =
        !!normalizedStreet && !!addressCity && !!addressState && !!addressZipCode && !getInvalidAddressErrorTranslationPath(normalizedStreet) && isValidZipCode(addressZipCode);
    const hasLegalName =
        !!legalFirstName &&
        !!legalLastName &&
        isValidLegalName(legalFirstName) &&
        isValidLegalName(legalLastName) &&
        legalFirstName.length <= CONST.LEGAL_NAME.MAX_LENGTH &&
        legalLastName.length <= CONST.LEGAL_NAME.MAX_LENGTH &&
        !doesContainReservedWord(legalFirstName, CONST.DISPLAY_NAME.RESERVED_NAMES) &&
        !doesContainReservedWord(legalLastName, CONST.DISPLAY_NAME.RESERVED_NAMES);

    return {
        legalFirstName,
        legalLastName,
        addressStreet: normalizedStreet,
        addressStreet2,
        addressCity,
        addressState,
        addressZipCode,
        displayStreet: addressStreet2 ? `${normalizedStreet}\n${addressStreet2}` : normalizedStreet,
        country: hasAddress ? CONST.COUNTRY.US : '',
        hasLegalName,
        hasAddress,
    };
}

function getSkippedBankAccountOwnerPages(details: BankAccountOwnerDetails): OwnerDetailPageName[] {
    const skippedPages: OwnerDetailPageName[] = [];
    if (details.hasLegalName) {
        skippedPages.push(BANK_ACCOUNT_PAGES.LEGAL_NAME);
    }
    if (details.hasAddress) {
        skippedPages.push(BANK_ACCOUNT_PAGES.ADDRESS);
    }
    return skippedPages;
}

function getFirstInvalidBankAccountOwnerPage(details: BankAccountOwnerDetails): OwnerDetailPageName | undefined {
    if (!details.hasLegalName) {
        return BANK_ACCOUNT_PAGES.LEGAL_NAME;
    }
    if (!details.hasAddress) {
        return BANK_ACCOUNT_PAGES.ADDRESS;
    }
    return undefined;
}

function getWalletOwnerDraftValues(details: BankAccountOwnerDetails): Partial<PersonalInfoStepProps> {
    return {
        legalFirstName: details.legalFirstName,
        legalLastName: details.legalLastName,
        addressStreet: details.displayStreet,
        addressCity: details.addressCity,
        addressState: details.addressState,
        addressZipCode: details.addressZipCode,
    };
}

function getPersonalInfoStepValues(
    walletAdditionalDetailsDraft: OnyxEntry<WalletAdditionalDetailsForm>,
    walletAdditionalDetails: OnyxEntry<WalletAdditionalDetailsRefactor>,
    privatePersonalDetails?: OnyxEntry<PrivatePersonalDetails>,
): PersonalInfoStepProps {
    const baseValues = getSubstepValues(PERSONAL_INFO_STEP_KEYS, walletAdditionalDetailsDraft, walletAdditionalDetails);
    const owner = getBankAccountOwnerDetails({walletAdditionalDetailsDraft, walletAdditionalDetails, privatePersonalDetails});

    return {
        [PERSONAL_INFO_STEP_KEYS.FIRST_NAME]: owner.legalFirstName,
        [PERSONAL_INFO_STEP_KEYS.LAST_NAME]: owner.legalLastName,
        [PERSONAL_INFO_STEP_KEYS.STREET]: owner.displayStreet,
        [PERSONAL_INFO_STEP_KEYS.CITY]: owner.addressCity,
        [PERSONAL_INFO_STEP_KEYS.STATE]: owner.addressState,
        [PERSONAL_INFO_STEP_KEYS.ZIP_CODE]: owner.addressZipCode,
        [PERSONAL_INFO_STEP_KEYS.DOB]: String(baseValues[PERSONAL_INFO_STEP_KEYS.DOB] ?? ''),
        [PERSONAL_INFO_STEP_KEYS.PHONE_NUMBER]: String(baseValues[PERSONAL_INFO_STEP_KEYS.PHONE_NUMBER] ?? ''),
        [PERSONAL_INFO_STEP_KEYS.SSN_LAST_4]: String(baseValues[PERSONAL_INFO_STEP_KEYS.SSN_LAST_4] ?? ''),
    };
}

export {getBankAccountOwnerDetails, getFirstInvalidBankAccountOwnerPage, getPersonalInfoStepValues, getSkippedBankAccountOwnerPages, getWalletOwnerDraftValues};
export type {BankAccountOwnerDetails, BankAccountOwnerSources, OwnerDetailPageName};
