import FullScreenLoadingIndicator from '@components/FullscreenLoadingIndicator';

import useOnyx from '@hooks/useOnyx';

import type {PlatformStackScreenProps} from '@navigation/PlatformStackNavigation/types';
import type {SettingsNavigatorParamList} from '@navigation/types';

import {fetchCorpayFields} from '@userActions/BankAccounts';

import ONYXKEYS from '@src/ONYXKEYS';
import type SCREENS from '@src/SCREENS';
import isLoadingOnyxValue from '@src/types/utils/isLoadingOnyxValue';

import React, {useEffect, useRef} from 'react';

import InternationalDepositAccountContent from './InternationalDepositAccountContent';

type InternationalDepositAccountProps = PlatformStackScreenProps<SettingsNavigatorParamList, typeof SCREENS.SETTINGS.ADD_BANK_ACCOUNT>;

function InternationalDepositAccount({route}: InternationalDepositAccountProps) {
    const [privatePersonalDetails, privatePersonalDetailsMetadata] = useOnyx(ONYXKEYS.PRIVATE_PERSONAL_DETAILS);
    const [corpayFields, corpayFieldsMetadata] = useOnyx(ONYXKEYS.CORPAY_FIELDS);
    const [bankAccountList, bankAccountListMetadata] = useOnyx(ONYXKEYS.BANK_ACCOUNT_LIST);
    const [draftValues, draftValuesMetadata] = useOnyx(ONYXKEYS.FORMS.INTERNATIONAL_BANK_ACCOUNT_FORM_DRAFT);
    const [country, countryMetadata] = useOnyx(ONYXKEYS.COUNTRY);
    const [personalBankAccount, personalBankAccountMetadata] = useOnyx(ONYXKEYS.PERSONAL_BANK_ACCOUNT);
    const [walletBankAccountResume, walletBankAccountResumeMetadata] = useOnyx(ONYXKEYS.WALLET_BANK_ACCOUNT_RESUME);
    const backTo = route.params?.backTo;

    const isLoading = isLoadingOnyxValue(
        privatePersonalDetailsMetadata,
        corpayFieldsMetadata,
        bankAccountListMetadata,
        draftValuesMetadata,
        countryMetadata,
        personalBankAccountMetadata,
        walletBankAccountResumeMetadata,
    );
    const hasMatchingCorpayFields =
        corpayFields?.bankCountry === draftValues?.bankCountry &&
        (!draftValues?.bankCurrency || corpayFields?.bankCurrency === draftValues.bankCurrency) &&
        !!corpayFields?.formFields?.length;
    const shouldWaitForResumeFields = walletBankAccountResume?.purpose === 'personal' && !!draftValues?.bankCountry && !hasMatchingCorpayFields;
    const hasRequestedResumeFieldsRef = useRef(false);

    useEffect(() => {
        if (!shouldWaitForResumeFields || personalBankAccount?.isLoading || hasRequestedResumeFieldsRef.current || !draftValues?.bankCountry) {
            return;
        }
        hasRequestedResumeFieldsRef.current = true;
        fetchCorpayFields(draftValues.bankCountry, draftValues.bankCurrency, false, false, true);
    }, [draftValues?.bankCountry, draftValues?.bankCurrency, personalBankAccount?.isLoading, shouldWaitForResumeFields]);

    if (isLoading || shouldWaitForResumeFields) {
        return <FullScreenLoadingIndicator />;
    }

    return (
        <InternationalDepositAccountContent
            privatePersonalDetails={privatePersonalDetails}
            corpayFields={corpayFields}
            bankAccountList={bankAccountList}
            draftValues={draftValues}
            country={country}
            isAccountLoading={personalBankAccount?.isLoading ?? false}
            backTo={backTo}
        />
    );
}

export default InternationalDepositAccount;
