import React, { useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import SearchBar from './SearchBar';
import UploadModal from './UploadModal';
import { FaSearch, FaUpload } from 'react-icons/fa';

export default function InspectorModal({ keyFields, error, accessToken }) {
  const [menuModalVisible, setMenuModalVisible] = useState(false);
  const [currentModalContent, setCurrentModalContent] = useState(null);
  const helpContainerRef = useRef(null);
  const isDragging = useRef(false);
  const startY = useRef(0);
  const startTranslateY = useRef(0);

  useEffect(() => {
    const initialTranslateY = window.innerHeight * 0.3;
    helpContainerRef.current.style.transform = `translateY(${initialTranslateY}px)`;
    startTranslateY.current = initialTranslateY;
  }, []);

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
          </div>
        </div>
      )}
    </div>
  );
}

InspectorModal.propTypes = {
  keyFields: PropTypes.array.isRequired,
  error: PropTypes.string,
  accessToken: PropTypes.string.isRequired,
};