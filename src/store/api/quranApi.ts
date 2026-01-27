import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

export interface Ayah {
  number: number;
  audio: string;
  text: string;
  numberInSurah: number;
  surah: {
    englishName: string;
    name: string;
    number: number;
  };
  juz: number;
}

export interface JuzResponse {
  code: number;
  data: {
    ayahs: Ayah[];
  };
}

export const quranApi = createApi({
  reducerPath: "quranApi",
  baseQuery: fetchBaseQuery({
    baseUrl: "https://api.alquran.cloud/v1",
  }),
  endpoints: (builder) => ({
    getJuz: builder.query<JuzResponse, { juz: number; reciter: string }>({
      query: ({ juz, reciter }) => `/juz/${juz}/${reciter}`,
    }),
  }),
});

export const { useGetJuzQuery } = quranApi;
