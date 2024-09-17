import axios from 'axios';

export async function updateRecordFields(instanceUrl, recordId, objectApiName, changes, accessToken) {
  try {
    const response = await axios.patch(
      `${instanceUrl}/services/data/v52.0/sobjects/${objectApiName}/${recordId}`,
      changes,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        }
      }
    );
    console.log('Fields updated successfully:', response.data);
    return response;
  } catch (error) {
    console.error('Error updating fields:', error);
    return error;
  }
}