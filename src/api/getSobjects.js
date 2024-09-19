import axios from 'axios';

export async function getAllSobjects(instanceUrl, accessToken) {
  try {
    const response = await axios.get(
      `${instanceUrl}/services/data/v52.0/sobjects`,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        }
      }
    );

    const sObjects = response.data.sobjects;
    const bulkUploadableSObjects = sObjects.filter(sObject => sObject.createable && sObject.updateable);
    return bulkUploadableSObjects;
  } catch (error) {
    console.error('Error fetching sObjects:', error);
    return error;
  }
}