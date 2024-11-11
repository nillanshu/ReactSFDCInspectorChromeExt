export const fetchProfiles = async (instanceUrl, accessToken) => {
    const response = await fetch(`${instanceUrl}/services/data/v59.0/query/?q=SELECT+Id,Name+FROM+Profile`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });
    const data = await response.json();
    return data.records;
  };
  
  export const fetchPermissionSets = async (instanceUrl, accessToken) => {
    const response = await fetch(`${instanceUrl}/services/data/v59.0/query/?q=SELECT+Id,Name+FROM+PermissionSet`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });
    const data = await response.json();
    return data.records;
  };
  