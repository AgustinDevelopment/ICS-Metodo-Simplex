import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
  palette: {
    primary: {
      main: '#3b82f6', // Tailwind blue-500
      light: '#60a5fa', // Tailwind blue-400
      dark: '#2563eb', // Tailwind blue-600
    },
    secondary: {
      main: '#6366f1', // Tailwind indigo-500
      light: '#818cf8', // Tailwind indigo-400
      dark: '#4f46e5', // Tailwind indigo-600
    },
    background: {
      default: '#ffffff',
      paper: '#f8fafc', // Tailwind slate-50
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none', // Prevents uppercase transform
          borderRadius: '0.375rem', // Tailwind rounded
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: '0.5rem', // Tailwind rounded-lg
          boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)', // Tailwind shadow
        },
      },
    },
  },
});