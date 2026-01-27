import { configureStore } from "@reduxjs/toolkit";
import { quranApi } from "@/store/api/quranApi";

export const store = configureStore({
  reducer: {
    [quranApi.reducerPath]: quranApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(quranApi.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
