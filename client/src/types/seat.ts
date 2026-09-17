// 1. Re-exportation des TYPES purement statiques
// (Seront totalement effacés dans le build final du navigateur)
export type { Seat as SeatType, SeatStatus as SeatStatusType } from '@server/schemas/seat';

// 2. Re-exportation des VALEURS (ex: si SeatStatus est un Enum/Object utilisé dans le JS)
export { SeatStatus } from '@server/schemas/seat';

// 3. Types spécifiques au Frontend (UI)
/*export interface SeatUIState {
  isSelectedByMe: boolean; // Sélectionné par l'utilisateur courant
  isPending: boolean;      // Requête de verrouillage/libération en cours
}

// 4. Type combiné pour tes composants React (données Serveur + état UI)
import type { Seat } from '@server/schemas/seat';

export type SeatWithUI = Seat & SeatUIState;*/