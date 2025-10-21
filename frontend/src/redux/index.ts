import { configureStore } from '@reduxjs/toolkit';
import simplexReducer from './slices/simplexSlice';

export const store = configureStore({
  reducer: {
    simplex: simplexReducer,
  },
});

// Tipos para usar en toda la app
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
