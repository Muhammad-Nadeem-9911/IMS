const CompanyProfile = require('../models/CompanyProfile');

// @desc    Get company profile
// @route   GET /api/company-profile
// @access  Private (e.g., Admin or Manager)
exports.getCompanyProfile = async (req, res, next) => {
    try {
        const profile = await CompanyProfile.findOne(); // Find the single profile
        if (!profile) {
            // You could return a 404 or an empty object/default values
            // For now, let's return 200 with a message or null data
            return res.status(200).json({ success: true, data: null, message: 'Company profile not yet created.' });
        }
        res.status(200).json({ success: true, data: profile });
    } catch (error) {
        console.error('Get Company Profile Error:', error.message);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// @desc    Create or Update company profile
// @route   POST or PUT /api/company-profile
// @access  Private (e.g., Admin or Manager)
exports.upsertCompanyProfile = async (req, res, next) => {
    const { companyName, address, phone, email, website, logoUrl, taxId } = req.body;

    try {
        let profile = await CompanyProfile.findOne();

        if (profile) {
            // Update existing profile
            profile.companyName = companyName || profile.companyName;
            profile.address = address || profile.address;
            profile.phone = phone !== undefined ? phone : profile.phone; // Allow empty string for phone
            profile.email = email !== undefined ? email : profile.email;
            profile.website = website !== undefined ? website : profile.website;
            profile.logoUrl = logoUrl !== undefined ? logoUrl : profile.logoUrl;
            profile.taxId = taxId !== undefined ? taxId : profile.taxId;

            const updatedProfile = await profile.save();
            return res.status(200).json({ success: true, data: updatedProfile, message: 'Company profile updated.' });
        } else {
            // Create new profile
            if (!companyName || !address) {
                return res.status(400).json({ success: false, message: 'Company Name and Address are required to create a profile.' });
            }
            profile = await CompanyProfile.create({
                companyName,
                address,
                phone,
                email,
                website,
                logoUrl,
                taxId
            });
            return res.status(201).json({ success: true, data: profile, message: 'Company profile created.' });
        }
    } catch (error) {
        console.error('Upsert Company Profile Error:', error.message);
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(val => val.message);
            return res.status(400).json({ success: false, message: messages });
        }
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// Note: A DELETE operation for a single company profile might not make sense.
// If you need to clear it, the PUT/POST can be used to set fields to null/empty.