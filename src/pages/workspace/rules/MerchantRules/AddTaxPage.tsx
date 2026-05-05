import React from 'react';
import RuleSelectionBase from '@components/Rule/RuleSelectionBase';
import useLocalize from '@hooks/useLocalize';
import useOnyx from '@hooks/useOnyx';
import {updateDraftMerchantRule} from '@libs/actions/User';
import Navigation from '@libs/Navigation/Navigation';
import type {PlatformStackScreenProps} from '@libs/Navigation/PlatformStackNavigation/types';
import type {SettingsNavigatorParamList} from '@libs/Navigation/types';
import ONYXKEYS from '@src/ONYXKEYS';
import ROUTES from '@src/ROUTES';
import type SCREENS from '@src/SCREENS';

type AddTaxPageProps = PlatformStackScreenProps<SettingsNavigatorParamList, typeof SCREENS.WORKSPACE.RULES_MERCHANT_TAX>;

function AddTaxPage({route}: AddTaxPageProps) {
    const {policyID, ruleID} = route.params;
    const {translate} = useLocalize();
    const isEditing = ruleID !== ROUTES.NEW;

    const [form] = useOnyx(ONYXKEYS.FORMS.MERCHANT_RULE_FORM);
    const [policy] = useOnyx(`${ONYXKEYS.COLLECTION.POLICY}${policyID}`);

    const taxes = policy?.taxRates?.taxes ?? {};
    const taxItems = [
        {name: translate('common.none'), value: ''},
        ...Object.entries(taxes)
            .filter(([, tax]) => !tax.isDisabled)
            .map(([taxKey, tax]) => ({
                name: `${tax.name} (${tax.value})`,
                value: taxKey,
            })),
    ];

    const selectedTaxItem = taxItems.find(({value}) => value === (form?.tax ?? ''));

    const backToRoute = isEditing ? ROUTES.RULES_MERCHANT_EDIT.getRoute(policyID, ruleID) : ROUTES.RULES_MERCHANT_NEW.getRoute(policyID);

    const onSave = (value?: string) => {
        updateDraftMerchantRule({tax: value});
    };

    return (
        <RuleSelectionBase
            titleKey="common.tax"
            testID="AddTaxPage"
            selectedItem={selectedTaxItem}
            items={taxItems}
            onSave={onSave}
            onBack={() => Navigation.goBack(backToRoute)}
            backToRoute={backToRoute}
        />
    );
}

AddTaxPage.displayName = 'AddTaxPage';

export default AddTaxPage;
