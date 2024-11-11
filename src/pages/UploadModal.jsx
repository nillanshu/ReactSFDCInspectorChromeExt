import React, { useState, useEffect, useCallback } from 'react';
import Select from 'react-select';
import Papa from 'papaparse';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { ThreeDots } from 'react-loader-spinner';
import {
  fetchSObjects,
  fetchSObjectFields,
  createJob,
  uploadBatch,
  closeJob,
  getJobStatus,
  getJobResults
} from '../api/uploadAPICalls';
import { getFromCache, setToCache } from '../utils/cache';
import { debounce } from '../utils/debounce';

const BULK_API_URL = '/services/data/v56.0/jobs/ingest';

export default function UploadModal({ accessToken }) {
  const [sObjects, setSObjects] = useState([]);
  const [instanceUrl, setInstanceUrl] = useState('');
  const [selectedSObject, setSelectedSObject] = useState(null);
  const [file, setFile] = useState(null);
  const [csvHeaders, setCsvHeaders] = useState([]);
  const [fieldMappings, setFieldMappings] = useState({});
  const [sObjectFields, setSObjectFields] = useState([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [failedRecords, setFailedRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [jobStatus, setJobStatus] = useState({
    success: 0,
    failed: 0,
    inProgress: 0,
  });

  useEffect(() => {
    const url = window.location.href;
    setInstanceUrl(
      url.includes('sandbox')
        ? url.replace(/\.sandbox\..*$/, '.sandbox.my.salesforce.com')
        : url.replace(/\.develop\..*$/, '.develop.my.salesforce.com')
    );

    const fetchSObjectsData = debounce(async () => {
      try {
        const cachedSObjects = getFromCache('sObjects');
        if (cachedSObjects) {
          setSObjects(cachedSObjects);
        } else {
          const sObjects = await fetchSObjects(instanceUrl, accessToken);
          const formattedSObjects = sObjects.map(sObject => ({ value: sObject.name, label: sObject.label }));
          setSObjects(formattedSObjects);
          setToCache('sObjects', formattedSObjects);
        }
      } catch (error) {
        console.error('Error fetching sObjects:', error);
        toast.error('Error fetching sObjects');
      }
    }, 300);

    if (instanceUrl) {
      fetchSObjectsData();
    }
  }, [instanceUrl, accessToken]);

  const handleSObjectChange = useCallback(async (selectedOption) => {
    setSelectedSObject(selectedOption);
    try {
      const cachedFields = getFromCache(`fields_${selectedOption.value}`);
      if (cachedFields) {
        setSObjectFields(cachedFields);
      } else {
        const fields = await fetchSObjectFields(instanceUrl, selectedOption.value, accessToken);
        const formattedFields = fields.map(field => ({ value: field.name, label: field.label }));
        setSObjectFields(formattedFields);
        setToCache(`fields_${selectedOption.value}`, formattedFields);
      }
    } catch (error) {
      console.error('Error fetching sObject fields:', error);
      toast.error('Error fetching sObject fields');
    }
  }, [instanceUrl, accessToken]);

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    setFile(file);

    Papa.parse(file, {
      header: true,
      complete: (results) => {
        setCsvHeaders(Object.keys(results.data[0]));
      }
    });
  };

  const handleMappingChange = (csvHeader, field) => {
    setFieldMappings(prevMappings => ({
      ...prevMappings,
      [csvHeader]: field
    }));
  };

  const handleUpload = async () => {
    if (!selectedSObject || !file) return;

    setLoading(true);

    try {
      const jobId = await createJob(instanceUrl, selectedSObject.value, accessToken);

      const fileContent = await file.text();
      const parsedData = Papa.parse(fileContent, { header: true }).data;
      const transformedData = parsedData.map(record => {
        const transformedRecord = {};
        for (const [csvHeader, sfField] of Object.entries(fieldMappings)) {
          transformedRecord[sfField] = record[csvHeader];
        }
        return transformedRecord;
      });
      const processedContent = Papa.unparse(transformedData);
      const blob = new Blob([processedContent.replace(/\r?\n/g, '\r\n')], { type: 'text/csv' });

      await uploadBatch(instanceUrl, jobId, blob, accessToken);
      await closeJob(instanceUrl, jobId, accessToken);

      const pollJobStatus = async () => {
        const jobStatusResponse = await getJobStatus(instanceUrl, jobId, accessToken);

        if (jobStatusResponse.state === 'JobComplete') {
          toast.success('File uploaded successfully');
          setErrorMessage('');

          const jobResultsResponse = await getJobResults(instanceUrl, jobId, 'successfulResults', accessToken);
          const failedRecordsResponse = await getJobResults(instanceUrl, jobId, 'failedResults', accessToken);

          const failedRecordsData = Papa.parse(failedRecordsResponse, { header: true }).data;
          setFailedRecords(failedRecordsData);

          setJobStatus({
            success: jobStatusResponse.numberRecordsProcessed - jobStatusResponse.numberRecordsFailed,
            failed: jobStatusResponse.numberRecordsFailed,
            inProgress: 0,
          });

          setLoading(false);

          if (jobStatusResponse.numberRecordsFailed === jobStatusResponse.numberRecordsProcessed) {
            console.error('Upload failed: All records failed to process.');
          }
        } else if (jobStatusResponse.state === 'Failed') {
          setErrorMessage(jobStatusResponse.errorMessage || 'Unknown error occurred');
          toast.error('Error uploading file');

          const failedRecordsResponse = await getJobResults(instanceUrl, jobId, 'failedResults', accessToken);
          const failedRecordsData = Papa.parse(failedRecordsResponse, { header: true }).data;
          setFailedRecords(failedRecordsData);

          setJobStatus({
            success: 0,
            failed: jobStatusResponse.numberRecordsFailed,
            inProgress: 0,
          });

          setLoading(false);
        } else {
          setJobStatus({
            success: jobStatusResponse.numberRecordsProcessed - jobStatusResponse.numberRecordsFailed,
            failed: jobStatusResponse.numberRecordsFailed,
            inProgress: jobStatusResponse.numberRecordsProcessed,
          });

          setTimeout(pollJobStatus, 5000);
        }
      };

      pollJobStatus();

    } catch (error) {
      console.error('Error uploading file:', error);
      setErrorMessage(error.message);
      toast.error('Error uploading file');
      setLoading(false);
    }
  };

  return (
    <div className="upload-container">
      <h2>Upload CSV File</h2>
      <div className="select-container">
        <Select
          options={sObjects}
          onChange={handleSObjectChange}
          placeholder="Select an sObject"
          styles={{
            menu: (provided) => ({
              ...provided,
              maxHeight: '150px',
              overflowY: 'auto',
            }),
          }}
        />
      </div>
      <div className="file-input-container">
        <input type="file" accept=".csv" onChange={handleFileChange} />
      </div>
      {csvHeaders.length > 0 && (
        <div className="mapping-container">
          <h3>Map CSV Columns to Salesforce Fields</h3>
          {csvHeaders.map((header) => (
            <div key={header} className="mapping-row">
              <span>{header}</span>
              <Select
                options={sObjectFields}
                onChange={(selectedOption) => handleMappingChange(header, selectedOption.value)}
                placeholder="Select a field"
              />
            </div>
          ))}
        </div>
      )}
      {failedRecords.length > 0 && (
        <div className="failed-records">
          <div className="job-status">
            <p>Success: {jobStatus.success}</p>
            <p>Failed: {jobStatus.failed}</p>
            <p>In Progress: {jobStatus.inProgress}</p>
          </div>
          <h3>Failed Records</h3>
          <pre>{JSON.stringify(failedRecords, null, 2)}</pre>
          <button onClick={() => setFailedRecords([])}>OK</button>
        </div>
      )}
      <button onClick={handleUpload} disabled={!selectedSObject || !file}>
        Upload
      </button>
      {loading && (
        <div className="loading-overlay">
          <div className="loading-container">
            <ThreeDots color="#00BFFF" height={80} width={80} />
          </div>
        </div>
      )}
      <ToastContainer />
    </div>
  );
}