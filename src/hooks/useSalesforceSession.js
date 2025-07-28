import { useEffect, useState } from 'react';

export function useSalesforceSession(accessToken) {
  const [keyFields, setKeyFields] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!accessToken) {
      setError('No active Salesforce session. Please ensure you are logged in to Salesforce.');
      setLoading(false);
      return;
    }

    const pathSegments = window.location.pathname.split('/');
    const objectApiName = pathSegments[pathSegments.length - 3];
    const recordId = pathSegments[pathSegments.length - 2];

    // Check if we're on a record page before trying to fetch data
    if (!objectApiName || !recordId || objectApiName === 'lightning' || recordId === 'view') {
      setError('Not on a Salesforce record page. Navigate to a record to see field data.');
      setLoading(false);
      return;
    }

    const instanceUrl = window.location.href.includes('sandbox')
      ? window.location.href.replace(/\.sandbox\..*$/, '.sandbox.my.salesforce.com')
      : window.location.href.replace(/\.develop\..*$/, '.develop.my.salesforce.com');

    fetch(`${instanceUrl}/services/data/v52.0/sobjects/${objectApiName}/${recordId}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    })
      .then(response => response.json())
      .then(data => {
        if (data.errorCode === 'INVALID_SESSION_ID') {
          setError('Invalid session. Please log in again.');
        } else if (data.errorCode) {
          setError(`Salesforce API Error: ${data.message || data.errorCode}`);
        } else {
          const fields = Object.entries(data).map(([key, value]) => ({
            fieldName: key,
            fieldValue: typeof value === 'object' ? JSON.stringify(value) : value
          }));
          console.log('Inside useSalesforceSession');
          console.log('Fields:', fields);
          setKeyFields(fields);
        }
        setLoading(false);
      })
      .catch((fetchError) => {
        console.error('Fetch error:', fetchError);
        setError('Error fetching key fields. Check console for details.');
        setLoading(false);
      });
  }, [accessToken]);

  return { keyFields, error, loading };
}