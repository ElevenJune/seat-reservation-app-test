export type CartContextType = {
  count: number,
  refresh: () => Promise<void>
};