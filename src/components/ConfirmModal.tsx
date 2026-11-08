import React from 'react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmButtonClass?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  confirmText = 'はい',
  cancelText = 'いいえ',
  confirmButtonClass = 'primary-btn',
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="modal-backdrop"
      onClick={onCancel}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
    >
      <div
        className="modal-content confirm-modal-card"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="confirm-modal-header">
          <h3 id="confirm-modal-title" className="confirm-modal-title">
            {title}
          </h3>
        </div>

        <div className="confirm-modal-body">
          <p className="confirm-modal-text">{message}</p>
        </div>

        <div className="confirm-modal-actions">
          <button
            type="button"
            className="secondary-btn confirm-cancel-btn"
            onClick={onCancel}
            autoFocus
          >
            {cancelText}
          </button>
          <button
            type="button"
            className={`${confirmButtonClass} confirm-ok-btn`}
            onClick={onConfirm}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

