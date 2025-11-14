import { createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'
import type { SimplexSolutionResponse, SimplexErrorResponse } from '../../services/simplexService'

interface SimplexState {
  currentResult: SimplexSolutionResponse | SimplexErrorResponse | null
  history: SimplexSolutionResponse[]
  isLoading: boolean
  error: string | null
}

const initialState: SimplexState = {
  currentResult: null,
  history: [],
  isLoading: false,
  error: null,
}

const simplexSlice = createSlice({
  name: 'simplex',
  initialState,
  reducers: {
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload
    },

    setSolution: (state, action: PayloadAction<SimplexSolutionResponse>) => {
      state.currentResult = action.payload
      state.history.push(action.payload)
      state.error = null
      state.isLoading = false
    },

    setError: (state, action: PayloadAction<SimplexErrorResponse | string>) => {
      if (typeof action.payload === 'string') {
        state.error = action.payload
        state.currentResult = null
      } else {
        state.currentResult = action.payload
        state.error = action.payload.msg
      }
      state.isLoading = false
    },

    clearCurrentResult: (state) => {
      state.currentResult = null
      state.error = null
    },

    clearHistory: (state) => {
      state.history = []
    },

    resetSimplex: (state) => {
      state.currentResult = null
      state.history = []
      state.isLoading = false
      state.error = null
    },
  },
})

export const {
  setLoading,
  setSolution,
  setError,
  clearCurrentResult,
  clearHistory,
  resetSimplex,
} = simplexSlice.actions

export default simplexSlice.reducer
