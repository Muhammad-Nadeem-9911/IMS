const ChartOfAccount = require('../models/ChartOfAccount');

const defaultAccounts = [
    {
        accountCode: '10000', // Primary cash account
        accountName: 'Cash',
        accountType: 'Asset',
        description: 'Cash on hand or in a primary bank account.',
        isSystemAccount: true,
    },
    {
        accountCode: '10100', // Example coding scheme
        accountName: 'Inventory',
        accountType: 'Asset',
        description: 'Goods held for sale or use in production.',
        isSystemAccount: true, // Optional flag to identify system-created accounts
    },
    {
        accountCode: '20100',
        accountName: 'Accounts Payable',
        accountType: 'Liability',
        description: 'Amounts owed to suppliers for goods or services received.',
        isSystemAccount: true,
    },
    {
        accountCode: '10200',
        accountName: 'Accounts Receivable',
        accountType: 'Asset',
        description: 'Amounts due from customers for goods or services sold.',
        isSystemAccount: true,
    },
    {
        accountCode: '40100',
        accountName: 'Sales Revenue',
        accountType: 'Revenue',
        description: 'Income generated from sales of goods or services.',
        isSystemAccount: true,
    },
    {
        accountCode: '20200',
        accountName: 'Sales Tax Payable',
        accountType: 'Liability',
        description: 'Sales tax collected from customers owed to tax authorities.',
        isSystemAccount: true,
    },
    {
        accountCode: '50100',
        accountName: 'Cost of Goods Sold',
        accountType: 'Expense',
        description: 'Direct costs attributable to the production of the goods sold.',
        isSystemAccount: true,
    }
];

const seedDefaultAccounts = async () => {
    try {
        for (const acc of defaultAccounts) {
            // Prefer finding by accountCode as it's likely more stable for system accounts
            let existingAccount = await ChartOfAccount.findOne({ accountCode: acc.accountCode });
            if (!existingAccount) {
                // If not found by code, try by name (in case code changed or was not unique initially)
                existingAccount = await ChartOfAccount.findOne({ accountName: acc.accountName });
            }

            if (!existingAccount) {
                await ChartOfAccount.create(acc);
                console.log(`[SEED] Created default account: ${acc.accountName} (${acc.accountCode}) with isSystemAccount=${acc.isSystemAccount}`);
            } else {
                // If account exists, ensure isSystemAccount is true
                if (existingAccount.isSystemAccount !== true) {
                    existingAccount.isSystemAccount = true;
                    // Optionally, update other fields if they differ from the seed definition,
                    // but be cautious as this might override intentional manual changes.
                    // For now, we'll just ensure the system flag.
                    // existingAccount.accountName = acc.accountName; // Example: if you want to enforce name
                    // existingAccount.accountType = acc.accountType; // Example: if you want to enforce type
                    // existingAccount.description = acc.description; // Example: if you want to enforce description
                    await existingAccount.save();
                    console.log(`[SEED] Updated account ${existingAccount.accountName} (${existingAccount.accountCode}) to set isSystemAccount=true.`);
                }
            }
        }
    } catch (error) {
        console.error('[SEED] Error seeding default accounts:', error.message);
    }
};

module.exports = seedDefaultAccounts;