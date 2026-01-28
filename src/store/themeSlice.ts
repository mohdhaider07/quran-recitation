import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { ThemeKey } from "@/lib/themes";

interface ThemeState {
  activeTheme: ThemeKey;
}

const initialState: ThemeState = {
  activeTheme: "dark", // Default to dark or pearl? User asked for light themes, but app seems dark-first. Let's stick to dark as default for now or pick 'pearl' as it's the first light one.
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
