import {WRITE_COMMANDS} from '@libs/API/types';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import type {OnyxCollection, Policy} from '@src/types/onyx';
import type {AnyOnyxUpdate} from '@src/types/onyx/Request';
import type Response from '@src/types/onyx/Response';

import type {OnyxKey} from 'react-native-onyx';

import Onyx from 'react-native-onyx';

import type Middleware from './types';

// This runs in request middleware, outside React, so it needs the current optimistic policy state to identify marked invite entries.
let allPolicies: OnyxCollection<Policy>;
Onyx.connectWithoutView({
    key: ONYXKEYS.COLLECTION.POLICY,
    callback: (value) => {
        allPolicies = value;
    },
});

function isRecord(value: unknown): value is Record<string, unknown> {
    return !!value && typeof value === 'object';
}

function getString(value: unknown): string | undefined {
    return typeof value === 'string' ? value : undefined;
}

function getResponseEmployeeLogins(onyxData: AnyOnyxUpdate[], policyKey: string): Set<string> {
    const employeeLogins = new Set<string>();
    for (const update of onyxData) {
        if (update.key !== policyKey || !isRecord(update.value) || !isRecord(update.value.employeeList)) {
            continue;
        }

        for (const [login, employee] of Object.entries(update.value.employeeList)) {
            if (employee !== null) {
                employeeLogins.add(login);
            }
        }
    }
    return employeeLogins;
}

function getResponsePersonalDetailLogins(onyxData: AnyOnyxUpdate[]): Map<number, string> {
    const loginByAccountID = new Map<number, string>();
    for (const update of onyxData) {
        if (update.key !== ONYXKEYS.PERSONAL_DETAILS_LIST || !isRecord(update.value)) {
            continue;
        }

        for (const [accountID, personalDetail] of Object.entries(update.value)) {
            if (!isRecord(personalDetail)) {
                continue;
            }

            const login = getString(personalDetail.login);
            if (login) {
                loginByAccountID.set(Number(accountID), login);
            }
        }
    }
    return loginByAccountID;
}

function getSuccessEmployeeList(successData: AnyOnyxUpdate[] | undefined, policyKey: string): Record<string, unknown> | undefined {
    for (const update of successData ?? []) {
        if (update.key === policyKey && isRecord(update.value) && isRecord(update.value.employeeList)) {
            return update.value.employeeList;
        }
    }
}

/**
 * Reconciles optimistic workspace-member invites when the server returns the same account under its canonical login.
 * The server response is applied before successData, so the stale success update must be removed as part of the same response path.
 */
const reconcileOptimisticWorkspaceMemberInvite: Middleware = <TKey extends OnyxKey>(requestResponse: Promise<Response<TKey> | void>, request) =>
    requestResponse.then((response) => {
        if (request.command !== WRITE_COMMANDS.ADD_MEMBERS_TO_WORKSPACE || response?.jsonCode !== CONST.JSON_CODE.SUCCESS || !response.onyxData) {
            return response;
        }

        const policyID = getString(request.data?.policyID);
        if (!policyID) {
            return response;
        }

        const policyKey = `${ONYXKEYS.COLLECTION.POLICY}${policyID}` as const;
        const employeeList = allPolicies?.[policyKey]?.employeeList;
        if (!employeeList) {
            return response;
        }

        const responseOnyxData = response.onyxData as AnyOnyxUpdate[];
        const responseEmployeeLogins = getResponseEmployeeLogins(responseOnyxData, policyKey);
        const responsePersonalDetailLogins = getResponsePersonalDetailLogins(responseOnyxData);
        const successEmployeeList = getSuccessEmployeeList(request.successData as AnyOnyxUpdate[] | undefined, policyKey);
        const staleEmployeeLogins: Record<string, null> = {};

        for (const [invitedLogin, employee] of Object.entries(employeeList)) {
            const invitedAccountID = employee?.invitedAccountID;
            if (!invitedAccountID) {
                continue;
            }

            const canonicalLogin = responsePersonalDetailLogins.get(invitedAccountID);
            if (!canonicalLogin || !responseEmployeeLogins.has(canonicalLogin)) {
                continue;
            }

            if (canonicalLogin === invitedLogin) {
                const successEmployee = successEmployeeList?.[invitedLogin];
                if (isRecord(successEmployee)) {
                    successEmployee.invitedAccountID = null;
                }
                continue;
            }

            staleEmployeeLogins[invitedLogin] = null;
            if (successEmployeeList) {
                delete successEmployeeList[invitedLogin];
            }
        }

        if (Object.keys(staleEmployeeLogins).length > 0) {
            responseOnyxData.push({
                onyxMethod: Onyx.METHOD.MERGE,
                key: policyKey,
                value: {employeeList: staleEmployeeLogins},
            });
        }

        return response;
    });

export default reconcileOptimisticWorkspaceMemberInvite;
