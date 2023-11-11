const cloudinary = require('cloudinary').v2;
const axios = require('axios');

cloudinary.config({
    cloud_name: 'dvlfsldbh',
    api_key: '746478836122374',
    api_secret: 'm52kyprJ5e9iYpLiDMLCEk98wsI'
});


async function getMediaUrl(mediaId, accessToken) {
    try {
        const response = await axios.get(`https://graph.facebook.com/v18.0/${mediaId}/`, {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        console.log(response.data);
        return response.data.url;
    } catch (error) {
        console.error('Error retrieving media URL:', error);
        throw error;
    }
}

// Function to download and upload the image
async function downloadAndUploadImage(mediaUrl, accessToken) {
    try {
        const mediaResp = await axios.get(mediaUrl, {
            timeout: 100000,
            responseType: 'arraybuffer',
            headers: { 'Authorization': `Bearer ${accessToken}` },
        });

        const uploadResp = await cloudinary.uploader.upload(`data:image/jpeg;base64,${Buffer.from(mediaResp.data).toString('base64')}`,timeout=100000);
        // console.log('Image uploaded to Cloudinary:', uploadResp.url);
        return uploadResp.url;
    } catch (error) {
        console.error('Error in downloading/uploading image:', error);
        throw error;
    }
}

module.exports = {
    getMediaUrl,
    downloadAndUploadImage
}