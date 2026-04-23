export type ResourceType = 'water' | 'electricity';
export type StatusType = 'cut' | 'restored';

export interface Report {
  id: string;
  type: ResourceType;
  status: StatusType;
  location: string;
  comment?: string;
  timestamp: number;
  userId: string;
}

export type Neighborhood = string;
export const NEIGHBORHOODS: Neighborhood[] = [
  'Bagira',
  'Ibanda',
  'Kadutu',
  'Kasha',
  'Panzi',
  'Muhungu',
  'Nguba',
  'Nyakavogo',
  'Cahi',
  'Ndendere'
];
