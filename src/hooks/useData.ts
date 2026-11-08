import { useQuery } from '@tanstack/react-query';
import { getSupabaseConfig, supabase } from '../lib/supabase';
import { MOCK_CONSORCIOS, MOCK_MEDICIONES } from '../lib/demoData';
import { loadLocalState } from '../db/sqlite';
import { Consorcio, Medicion } from '../types';

export const useConsorcios = () => {
  return useQuery({
    queryKey: ['consorcios'],
    queryFn: async () => {
      if (getSupabaseConfig().isDemoMode) {
        return loadLocalState<Consorcio[]>('pat_consorcios_v1', MOCK_CONSORCIOS);
      }
      const { data, error } = await supabase.from('consorcios').select('*');
      if (error) throw error;
      return data;
    },
  });
};

export const useMediciones = () => {
  return useQuery({
    queryKey: ['mediciones'],
    queryFn: async () => {
      if (getSupabaseConfig().isDemoMode) {
        return loadLocalState<Medicion[]>('pat_mediciones_v1', MOCK_MEDICIONES);
      }
      const { data, error } = await supabase.from('mediciones').select('*');
      if (error) throw error;
      return data;
    },
  });
};
