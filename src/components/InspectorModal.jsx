import React, { useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import SearchBar from '../pages/SearchBar';
import UploadModal from '../pages/UploadModal';
import AnonymousWindow from '../pages/AnonymousWindow';
import FieldCreator from '../pages/FieldCreator';
import { FaSearch, FaUpload, FaCode, FaPlus } from 'react-icons/fa';

export default function InspectorModal({ keyFields, error, accessToken, userId }) {
  const [menuModalVisible, setMenuModalVisible] = useState(false);
  const [currentModalContent, setCurrentModalContent] = useState(null);
  const helpContainerRef = useRef(null);
  const isDragging = useRef(false);
  const startY = useRef(0);
  const startTranslateY = useRef(0);
  const isResizing = useRef(false);
  const startWidth = useRef(0);
  const startHeight = useRef(0);
  const startX = useRef(0);
  const startYResize = useRef(0);
  const [instanceUrl, setInstanceUrl] = useState('');

  useEffect(() => {
    const initialTranslateY = window.innerHeight * 0.3;
    helpContainerRef.current.style.transform = `translateY(${initialTranslateY}px)`;
    startTranslateY.current = initialTranslateY;
  }, []);

  useEffect(() => {
    const url = window.location.href;
    setInstanceUrl(
      url.includes('sandbox')
        ? url.replace(/\.sandbox\..*$/, '.sandbox.my.salesforce.com')
        : url.replace(/\.develop\..*$/, '.develop.my.salesforce.com')
    );

  }, [instanceUrl, accessToken]);

  const handleMenuModalVisible = () => {
    setMenuModalVisible(!menuModalVisible);
    setCurrentModalContent('search');
  };

  const handleOpenModal = (content) => {
    setCurrentModalContent(content);
  };

  const handleMouseDown = (e) => {
    e.preventDefault();
    isDragging.current = true;

    startY.current = e.clientY;

    const computedStyle = window.getComputedStyle(helpContainerRef.current);
    const matrix = new DOMMatrix(computedStyle.transform);
    startTranslateY.current = matrix.m42;

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleMouseMove = (e) => {
    if (isDragging.current) {
      const windowHeight = window.innerHeight;
      const componentHeight = helpContainerRef.current.offsetHeight;

      let newY = startTranslateY.current + (e.clientY - startY.current);

      if (newY < 0) newY = 0;
      if (newY > windowHeight - componentHeight) newY = windowHeight - componentHeight;

      helpContainerRef.current.style.transform = `translateY(${newY}px)`;
    }
  };

  const handleMouseUp = () => {
    isDragging.current = false;

    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  };

  const handleResizeMouseDown = (e) => {
    e.preventDefault();
    isResizing.current = true;

    startWidth.current = helpContainerRef.current.offsetWidth;
    startHeight.current = helpContainerRef.current.offsetHeight;
    startX.current = e.clientX;
    startYResize.current = e.clientY;

    document.addEventListener('mousemove', handleResizeMouseMove);
    document.addEventListener('mouseup', handleResizeMouseUp);
  };

  const handleResizeMouseMove = (e) => {
    if (isResizing.current) {
      const newWidth = startWidth.current + (e.clientX - startX.current);
      const newHeight = startHeight.current + (e.clientY - startYResize.current);

      helpContainerRef.current.style.width = `${newWidth}px`;
      helpContainerRef.current.style.height = `${newHeight}px`;
    }
  };

  const handleResizeMouseUp = () => {
    isResizing.current = false;

    document.removeEventListener('mousemove', handleResizeMouseMove);
    document.removeEventListener('mouseup', handleResizeMouseUp);
  };

  return (
    <div>
      <div
        id="help-container"
        ref={helpContainerRef}
        onMouseDown={handleMouseDown}
        onClick={handleMenuModalVisible}
        role="button"
        tabIndex={0}
        aria-label="Help Container"
      >
        <div className="help-content">
          <div>Need Help</div>
          <div className="help-question-mark">?</div>
        </div>
      </div>

      {menuModalVisible && (
        <div id="modal" className="fixed-left">
          <div className="fixed-left-content">
            <div className="inspector-icons">
              <FaSearch className="inspector-icon" onClick={() => handleOpenModal('search')} />
              <FaUpload className="inspector-icon" onClick={() => handleOpenModal('upload')} />
              <FaCode className="inspector-icon" onClick={() => handleOpenModal('code')} />
              <FaPlus className="inspector-icon" onClick={() => handleOpenModal('bulkField')} />
            </div>
            {currentModalContent === 'search' && (
              <>
                {error && <p style={{ color: 'red' }}>{error}</p>}
                <SearchBar keyFields={keyFields} accessToken={accessToken} />
              </>
            )}
            {currentModalContent === 'upload' && (
              <UploadModal accessToken={accessToken} />
            )}
            {currentModalContent === 'code' && (
              <AnonymousWindow accessToken={accessToken} instanceUrl={instanceUrl} userId={userId} />
            )}
            {currentModalContent === 'bulkField' && (
              <FieldCreator accessToken={accessToken} instanceUrl={instanceUrl} />
            )}
          </div>
          <div className="resize-handle" onMouseDown={handleResizeMouseDown}></div>
        </div>
      )}
    </div>
  );
}

InspectorModal.propTypes = {
  keyFields: PropTypes.array.isRequired,
  error: PropTypes.string,
  accessToken: PropTypes.string.isRequired,
  userId: PropTypes.string.isRequired,
};