import { useInvalidateMutation } from './mutation-helpers';
import { queryKeys } from './query-keys';
import { triggerEvent, type TriggerPayload, type TriggerResponse } from '../../services/api';

export function useTriggerEvent() {
  return useInvalidateMutation<TriggerResponse, TriggerPayload>({
    mutationFn: (payload) => triggerEvent(payload),
    invalidate: [queryKeys.stats.all],
    successMessage: ({ data }) => {
      const delivered = data.delivered_to ?? 0;
      return delivered > 0
        ? `Evento entregue a ${delivered} ${delivered === 1 ? 'conexão ativa' : 'conexões ativas'}.`
        : 'Evento disparado com sucesso.';
    },
    errorMessage: 'Não foi possível disparar o evento.',
  });
}
