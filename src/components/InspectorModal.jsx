import React, { useEffect, useState } from 'react';
import SearchBar from './SearchBar';
import UploadModal from './UploadModal';
import { FaSearch, FaUpload } from 'react-icons/fa';

export default function InspectorModal({ keyFields, error, accessToken }) {
  const [modalVisible, setModalVisible] = useState(false);
  const [uploadModalVisible, setUploadModalVisible] = useState(false);

  useEffect(() => {
    console.log('Inside Inspector Modal');
    console.log('Key Fields:', keyFields);
    console.log('Error:', error);
    console.log('Modal Visible:', modalVisible);
  }, [keyFields, error, modalVisible]);

  if (!keyFields || keyFields.length === 0) {
    console.log('No key fields available');
    return null;
  }

  return (
    <div>
      <div id="help-container">
        <div className="help-content">
          <div>Need Help</div>
          <div className="help-question-mark">?</div>
          <div className="icons">
            <FaSearch className="icon" onClick={() => setModalVisible(!modalVisible)} />
            <FaUpload className="icon" onClick={() => setUploadModalVisible(!uploadModalVisible)} />
          </div>
        </div>
      </div>
      {modalVisible && (
        <div id="modal" className="fixed-left">
          <div className="fixed-left-content">
            {error && <p style={{ color: 'red' }}>{error}</p>}
            <SearchBar keyFields={keyFields} accessToken={accessToken} />
          </div>
        </div>
      )}
      {uploadModalVisible && (
        <div id="upload-modal" className="fixed-left">
          <div className="fixed-left-content">
            <UploadModal accessToken={accessToken} />
          </div>
        </div>
      )}
    </div>
  );
}