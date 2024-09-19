import axios from 'axios';

export async function getSObjectFields(instanceUrl, sObjectName, accessToken) {
  const url = `${instanceUrl}/services/data/v52.0/sobjects/${sObjectName}/describe`;
  try {
    const response = await axios.get(url, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    return response.data.fields;
  } catch (error) {
    console.error('Error fetching sObject fields from URL:', url);
    console.error('Response status:', error.response ? error.response.status : 'No response');
    console.error('Response data:', error.response ? error.response.data : 'No response data');
    throw error;
  }
}