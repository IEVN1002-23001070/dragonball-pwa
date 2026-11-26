export interface Character {
  id: number;
  name: string;
  ki: string;
  maxKi: string;
  race: string;
  gender: string;
  description: string;
  image: string;
  affiliation: string;
}

export interface Planet {
  id: number;
  name: string;
  isDestroyed: boolean;
  description: string;
  image: string;
}

export interface Transformation {
  id: number;
  name: string;
  image: string;
  ki: string;
}

export interface CharacterDetail extends Character {
  originPlanet?: Planet | null;
  transformations?: Transformation[] | null;
}

export interface PaginationMeta {
  totalItems: number;
  itemCount: number;
  itemsPerPage: number;
  totalPages: number;
  currentPage: number;
}

export interface PaginationLinks {
  first: string;
  previous: string;
  next: string;
  last: string;
}

export interface CharacterResponse {
  items: Character[];
  meta: PaginationMeta;
  links: PaginationLinks;
}

export interface PlanetDetail extends Planet {
  characters?: Character[] | null;
}

export interface PlanetResponse {
  items: Planet[];
  meta: PaginationMeta;
  links: PaginationLinks;
}

export interface TransformationDetail extends Transformation {
  character?: Character | null;
}
