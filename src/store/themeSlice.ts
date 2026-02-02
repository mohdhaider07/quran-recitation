import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { ThemeKey } from "@/lib/themes";

interface ThemeState {
  activeTheme: ThemeKey;
}

const initialState: ThemeState = {
  activeTheme: "mint",
};

const themeSlice = createSlice({
  name: "theme",
  initialState,
  reducers: {
    setTheme: (state, action: PayloadAction<ThemeKey>) => {
      state.activeTheme = action.payload;
    },
  },
});

export const { setTheme } = themeSlice.actions;
export default themeSlice.reducer;
