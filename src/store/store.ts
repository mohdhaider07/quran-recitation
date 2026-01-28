import { configureStore } from "@reduxjs/toolkit";
import { quranApi } from "@/store/api/quranApi";
import themeReducer from "./themeSlice";

export const store = configureStore({
  reducer: {
    [quranApi.reducerPath]: quranApi.reducer,
    theme: themeReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(quranApi.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
