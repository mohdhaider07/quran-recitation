import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

export interface Surah {
  number: number;
  name: string;
  englishName: string;
  englishNameTranslation: string;
  numberOfAyahs: number;
  revelationType: string;
}

export interface Ayah {
  number: number;
  audio: string;
  audioSecondary?: string[];
  text: string;
  numberInSurah: number;
  surah: Surah;
  juz: number;
  manzil?: number;
  page?: number;
  ruku?: number;
  hizbQuarter?: number;
  sajda?: boolean | object;
}

export interface JuzResponse {
  code: number;
  status?: string;
  data: {
    number: number;
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
