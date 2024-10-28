// apiService.js
import axios from 'axios';

export const fetchSObjects = async (instanceUrl, accessToken) => {
  const response = await axios.get(`${instanceUrl}/services/data/v56.0/sobjects`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  });
  return response.data.sobjects;
};

export const fetchSObjectFields = async (instanceUrl, sObjectName, accessToken) => {
  const response = await axios.get(`${instanceUrl}/services/data/v56.0/sobjects/${sObjectName}/describe`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  });
  return response.data.fields;
};

export const createJob = async (instanceUrl, sObjectName, accessToken) => {
  const response = await axios.post(`${instanceUrl}/services/data/v56.0/jobs/ingest`, {
    object: sObjectName,
    contentType: 'CSV',
    operation: 'insert',
    lineEnding: 'CRLF'
  }, {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`
    }
  });
  return response.data.id;
};

export const uploadBatch = async (instanceUrl, jobId, blob, accessToken) => {
  await axios.put(`${instanceUrl}/services/data/v56.0/jobs/ingest/${jobId}/batches`, blob, {
    headers: {
      'Content-Type': 'text/csv',
      'Authorization': `Bearer ${accessToken}`
    }
  });
};

export const closeJob = async (instanceUrl, jobId, accessToken) => {
  await axios.patch(`${instanceUrl}/services/data/v56.0/jobs/ingest/${jobId}`, {
    state: 'UploadComplete'
  }, {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`
    }
  });
};

export const getJobStatus = async (instanceUrl, jobId, accessToken) => {
  const response = await axios.get(`${instanceUrl}/services/data/v56.0/jobs/ingest/${jobId}`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  });
  return response.data;
};

export const getJobResults = async (instanceUrl, jobId, resultType, accessToken) => {
  const response = await axios.get(`${instanceUrl}/services/data/v56.0/jobs/ingest/${jobId}/${resultType}`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  });
  return response.data;
};