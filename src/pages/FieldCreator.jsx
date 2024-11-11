import React, { useState, useEffect, useCallback } from 'react';
import Select from 'react-select';
import { FaCopy, FaTrash } from 'react-icons/fa';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { fetchSObjects } from '../api/uploadAPICalls';
import { fetchProfiles, fetchPermissionSets } from '../api/getProfilesPSets'
import { getFromCache, setToCache } from '../utils/cache';
import { debounce } from '../utils/debounce';
import Modal from '../components/Modal';
import DataTable from 'react-data-table-component';

const FieldCreator = ({ accessToken, instanceUrl }) => {
  const [selectedObject, setSelectedObject] = useState(null);
  const [fieldRows, setFieldRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sObjects, setSObjects] = useState([]);
  const [openModal, setOpenModal] = useState({ type: null, index: null });
  const [showPermissionSets, setShowPermissionSets] = useState(true);
  const [showProfiles, setShowProfiles] = useState(false);
  const [permissionsData, setPermissionsData] = useState({});
  const [profiles, setProfiles] = useState([]);
  const [permissionSets, setPermissionSets] = useState([]);

  const fieldTypes = [
    { value: 'Text', label: 'Text' },
    { value: 'Number', label: 'Number' },
  ];

  useEffect(() => {
    if (instanceUrl) {
      fetchSObjectsData();
    }

    if (instanceUrl && accessToken) {
      fetchProfilesAndPermissions();
    }
  }, [instanceUrl, accessToken]);

  const fetchSObjectsData = debounce(async () => {
    setLoading(true);
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
    } finally {
      setLoading(false);
    }
  }, 300);

  const fetchProfilesAndPermissions = async () => {
    setLoading(true);
    try {
      const profiles = await fetchProfiles(instanceUrl, accessToken);
      const permissionSets = await fetchPermissionSets(instanceUrl, accessToken);

      const formattedProfiles = profiles.map(profile => ({
        id: profile.Id,
        name: profile.Name,
      }));
      const formattedPermissionSets = permissionSets.map(permissionSet => ({
        id: permissionSet.Id,
        name: permissionSet.Name,
      }));

      const filteredPermissionSets = formattedPermissionSets.filter(set => 
        !set.name.startsWith("SubscriptionManagement") && !set.name.startsWith("X00")
      );
      
      setProfiles(formattedProfiles);
      setPermissionSets(filteredPermissionSets);
    } catch (error) {
      console.error('Error fetching profiles or permission sets:', error);
      toast.error('Error loading permissions data');
    } finally {
      setLoading(false);
    }
  };

  const handleObjectChange = useCallback((selectedOption) => {
    setSelectedObject(selectedOption);
  }, []);

  const handleAddFieldRow = useCallback(() => {
    setFieldRows([...fieldRows, { label: '', apiName: '', fieldType: '', options: {}, permissions: {} }]);
  }, [fieldRows]);

  const handleCopyFieldRow = useCallback((index) => {
    const newFieldRows = [...fieldRows];
    newFieldRows.splice(index + 1, 0, { ...fieldRows[index] });
    setFieldRows(newFieldRows);
  }, [fieldRows]);

  const handleDeleteFieldRow = useCallback((index) => {
    const newFieldRows = fieldRows.filter((_, i) => i !== index);
    setFieldRows(newFieldRows);
  }, [fieldRows]);

  const handleClearAll = useCallback(() => {
    setFieldRows([]);
  }, []);

  const handleImportCSV = useCallback((event) => {
    const file = event.target.files[0];
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      const rows = text.split('\n').map(row => {
        const [label, apiName, fieldType] = row.split(',');
        return { label, apiName, fieldType, options: {}, permissions: {} };
      });
      setFieldRows(rows);
    };
    reader.readAsText(file);
  }, []);

  const handleDeployFields = useCallback(async () => {
    console.log('Deploying fields:', fieldRows);
    
    const endpointUrl = `${instanceUrl}/services/Soap/m/59.0`;
  
    const fieldsMetadataXml = fieldRows.map(row => {
      const { label, apiName, fieldType, options } = row;
      return `
        <met:metadata xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:type="met:CustomField">
          <label>${label || ''}</label>
          <fullName>${selectedObject.value}.${apiName}__c</fullName>
          <type>${fieldType || ''}</type>
          ${options.length ? `<length>${options.length}</length>` : ''}
          ${options.description ? `<description>${options.description}</description>` : ''}
          <required>${options.required || false}</required>
          <unique>${options.unique || false}</unique>
          <externalId>${options.externalId || false}</externalId>
        </met:metadata>`;
    }).join('');
  
    const soapBody = `
      <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:met="http://soap.sforce.com/2006/04/metadata">
        <soapenv:Header>
          <met:SessionHeader>
            <met:sessionId>${accessToken}</met:sessionId>
          </met:SessionHeader>
        </soapenv:Header>
        <soapenv:Body>
          <met:upsertMetadata>
            ${fieldsMetadataXml}
          </met:upsertMetadata>
        </soapenv:Body>
      </soapenv:Envelope>`;
  
    try {
      chrome.runtime.sendMessage(
        {
          action: 'deployFields',
          endpointUrl: endpointUrl,
          soapBody: soapBody,
        },
        async (response) => {
          if (response.success) {
            console.log('Deploy Response:', response.response);
            await deployFieldPermissions();
            toast.success('Fields and permissions deployed successfully!');
          } else {
            console.error('Error deploying fields:', response.error);
            toast.error('Error deploying fields');
          }
        }
      );
    } catch (error) {
      console.error('Error deploying fields:', error);
      toast.error('Error deploying fields');
    }
  }, [fieldRows, instanceUrl, accessToken]);
  
  const deployFieldPermissions = useCallback(async () => {
    console.log('Deploying field permissions:', fieldRows);
  
    const endpointUrl = `${instanceUrl}/services/Soap/m/59.0`;
  
    const permissionsMetadataXml = fieldRows.map(row => {
      const { apiName, permissions } = row;
      return Object.entries(permissions).map(([key, value]) => `
        <met:metadata xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:type="met:FieldPermissions">
          <editable>${value.editable || false}</editable>
          <readable>${value.readable || false}</readable>
          <field>${selectedObject.value}.${apiName}__c</field>
          <permissionSet>${key}</permissionSet>
        </met:metadata>`).join('');
    }).join('');
  
    const soapBody = `
      <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:met="http://soap.sforce.com/2006/04/metadata">
        <soapenv:Header>
          <met:SessionHeader>
            <met:sessionId>${accessToken}</met:sessionId>
          </met:SessionHeader>
        </soapenv:Header>
        <soapenv:Body>
          <met:upsertMetadata>
            ${permissionsMetadataXml}
          </met:upsertMetadata>
        </soapenv:Body>
      </soapenv:Envelope>`;
  
    try {
      chrome.runtime.sendMessage(
        {
          action: 'deployFieldPermissions',
          endpointUrl: endpointUrl,
          soapBody: soapBody,
        },
        (response) => {
          if (response.success) {
            console.log('Deploy Permissions Response:', response.response);
          } else {
            console.error('Error deploying field permissions:', response.error);
            toast.error('Error deploying field permissions');
          }
        }
      );
    } catch (error) {
      console.error('Error deploying field permissions:', error);
      toast.error('Error deploying field permissions');
    }
  }, [fieldRows, instanceUrl, accessToken, selectedObject]);

  const toPascalCase = useCallback((str) => {
    return str.replace(/\w+/g, 
      function(w){return w[0].toUpperCase() + w.slice(1);}).replace(/\s+/g, '');
  }, []);

  const handleFieldChange = useCallback((index, field, value) => {
    const newFieldRows = [...fieldRows];
    newFieldRows[index][field] = value;
    if (field === 'label') {
      newFieldRows[index]['apiName'] = toPascalCase(value);
    }
    setFieldRows(newFieldRows);
  }, [fieldRows, toPascalCase]);

  const handleOptionsChange = useCallback((index, options) => {
    const newFieldRows = [...fieldRows];
    newFieldRows[index].options = options;
    setFieldRows(newFieldRows);
  }, [fieldRows]);

  const handlePermissionsChange = useCallback((index, permissions) => {
    const newFieldRows = [...fieldRows];
    newFieldRows[index].permissions = permissions;
    setFieldRows(newFieldRows);
  }, [fieldRows]);

  const openModalHandler = useCallback((index, type) => {
    setOpenModal({ type, index });
    setPermissionsData(fieldRows[index].permissions || {});
  }, [fieldRows]);

  const closeModalHandler = useCallback(() => {
    setOpenModal({ type: null, index: null });
  }, []);

  const saveOptionsHandler = useCallback(() => {
    closeModalHandler();
  }, [closeModalHandler]);

  const savePermissionsHandler = useCallback(() => {
    const newFieldRows = [...fieldRows];
    newFieldRows[openModal.index].permissions = permissionsData;
    setFieldRows(newFieldRows);
    closeModalHandler();
  }, [fieldRows, openModal.index, permissionsData, closeModalHandler]);

  const togglePermissionSets = useCallback(() => {
    setShowPermissionSets(!showPermissionSets);
    if (showProfiles) setShowProfiles(false);
  }, [showPermissionSets, showProfiles]);

  const toggleProfiles = useCallback(() => {
    setShowProfiles(!showProfiles);
  }, [showProfiles]);

  const handlePermissionsDataChange = useCallback((name, type, value) => {
    setPermissionsData(prevState => ({
      ...prevState,
      [name]: {
        ...prevState[name],
        [type]: value
      }
    }));
  }, []);

  const columns = [
    { name: 'Name', selector: row => row.name, sortable: true },
    { name: 'Edit', cell: row => <input type="checkbox" checked={permissionsData[row.name]?.editable || false} onChange={(e) => handlePermissionsDataChange(row.name, 'editable', e.target.checked)} /> },
    { name: 'Read', cell: row => <input type="checkbox" checked={permissionsData[row.name]?.readable || false} onChange={(e) => handlePermissionsDataChange(row.name, 'readable', e.target.checked)} /> }
  ];

  return (
    <div className="field-creator">
      <h2>Field Creator</h2>
      <div className="select-container">
        <Select
          options={sObjects}
          onChange={handleObjectChange}
          placeholder="Select an Object"
          isLoading={loading}
        />
      </div>
      <div className="button-container">
        <button onClick={handleClearAll}>Clear All</button>
        <label htmlFor="csvInput" className="import-csv-button">Import CSV</label>
        <input id="csvInput" type="file" accept=".csv" onChange={handleImportCSV} style={{ display: 'none' }} />
        <button onClick={handleDeployFields}>Deploy Fields</button>
      </div>
      <hr />
      <div className="field-rows">
        {fieldRows.map((row, index) => (
          <div key={index} className="field-row">
            <FaCopy onClick={() => handleCopyFieldRow(index)} style={{ cursor: 'pointer', color: '#F38117', marginRight: '4px', fontSize: '15px' }} />
            <FaTrash onClick={() => handleDeleteFieldRow(index)} style={{ cursor: 'pointer', color: '#F38117', marginRight: '4px', fontSize: '15px' }} />
            <input
              type="text"
              placeholder="Label"
              value={row.label}
              onChange={(e) => handleFieldChange(index, 'label', e.target.value)}
            />
            <input
              type="text"
              placeholder="API Name"
              value={row.apiName}
              onChange={(e) => handleFieldChange(index, 'apiName', e.target.value)}
            />
            <Select
              options={fieldTypes}
              value={fieldTypes.find(option => option.value === row.fieldType)}
              onChange={(selectedOption) => handleFieldChange(index, 'fieldType', selectedOption.value)}
              placeholder="Field Type"
              className='field-type-select'
            />
            <button onClick={() => openModalHandler(index, 'options')}>Options</button>
            <button onClick={() => openModalHandler(index, 'permissions')}>Permissions</button>
          </div>
        ))}
      </div>
      <button onClick={handleAddFieldRow}>Add Field</button>
      <ToastContainer />

      {/* Modal */}
      <Modal
        isOpen={!!openModal.type}
        onClose={closeModalHandler}
        onSave={openModal.type === 'options' ? saveOptionsHandler : savePermissionsHandler}
        title={openModal.type === 'options' ? 'Set Field Options' : 'Set Field Permissions'}
        >
        <form className="modal-form">
            {openModal.type === 'options' && (
            <>
                <label>Length</label>
                <input type="number" placeholder="255" onChange={(e) => handleOptionsChange(openModal.index, { ...fieldRows[openModal.index].options, length: e.target.value })} />

                <label>Description</label>
                <textarea placeholder="Enter description here" rows="2" onChange={(e) => handleOptionsChange(openModal.index, { ...fieldRows[openModal.index].options, description: e.target.value })} />

                <label>Help Text</label>
                <textarea placeholder="Enter help text here" rows="2" onChange={(e) => handleOptionsChange(openModal.index, { ...fieldRows[openModal.index].options, helpText: e.target.value })} />

                <div className="checkbox-group">
                <label><input type="checkbox" onChange={(e) => handleOptionsChange(openModal.index, { ...fieldRows[openModal.index].options, required: e.target.checked })} /> Required</label>
                <label><input type="checkbox" onChange={(e) => handleOptionsChange(openModal.index, { ...fieldRows[openModal.index].options, unique: e.target.checked })} /> Unique</label>
                <label><input type="checkbox" onChange={(e) => handleOptionsChange(openModal.index, { ...fieldRows[openModal.index].options, externalId: e.target.checked })} /> External ID</label>
                </div>
            </>
            )}
            {openModal.type === 'permissions' && (
            <>
                <input
                type="text"
                placeholder="Search profiles and permission sets..."
                className="modal-search"
                />

                <p className="modal-note">
                Please consider granting field access to Permission Sets instead of Profiles.
                </p>

                <div className="section-toggle" onClick={togglePermissionSets}>
                <strong>Permission Sets {showPermissionSets ? '▼' : '▶'}</strong>
                </div>
                {showPermissionSets && (
                <DataTable
                    columns={columns}
                    data={permissionSets}
                    noDataComponent="No Permission Sets available."
                />
                )}

                <div className="section-toggle" onClick={toggleProfiles}>
                <strong>Profiles {showProfiles ? '▼' : '▶'}</strong>
                </div>
                {showProfiles && (
                <DataTable
                    columns={columns}
                    data={profiles}
                    noDataComponent="No Profiles available."
                />
                )}
            </>
            )}
        </form>
      </Modal>

    </div>
  );
};

export default FieldCreator;