import { toast } from 'react-toastify';

export const TURNO_CONFIRMATION_TOAST_ID = 'turno-confirmation';

export const showTurnoConfirmationToast = (message) => toast.success(message, {
  containerId: TURNO_CONFIRMATION_TOAST_ID,
  autoClose: 7000,
  closeButton: true,
  closeOnClick: false,
});
