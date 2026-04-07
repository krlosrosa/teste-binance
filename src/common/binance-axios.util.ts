/**
 * `@binance/connector` devolve a resposta completa do Axios, não só `data`.
 * Serializar o objeto raiz quebra com "Converting circular structure to JSON".
 */
export const unwrapAxiosData = <T>(raw: unknown): T => {
  if (
    raw !== null &&
    typeof raw === 'object' &&
    'data' in raw &&
    typeof (raw as { status?: unknown }).status === 'number'
  ) {
    return (raw as { data: T }).data;
  }
  return raw as T;
};
