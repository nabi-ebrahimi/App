type WalletBankAccountResume = {
    /** Identifies drafts that were started from Wallet and may be resumed after incidental dismissal */
    origin: 'wallet';

    /** Determines which bank-account draft is compatible with this resume entry */
    purpose: 'personal' | 'business';

    /** Country selected for the active setup */
    country?: string;

    /** Currency selected for the active setup */
    currency?: string;

    /** Personal bank-account connection type */
    setupType?: string;

    /** Last non-success page visited in the US personal flow */
    currentPage?: string;

    /** Workspace associated with a business bank-account setup */
    policyID?: string;

    /** Backend bank-account identity when one has been created */
    bankAccountID?: number;
};

export default WalletBankAccountResume;
