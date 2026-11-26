import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CharacterDetail, CharacterResponse, PlanetDetail, PlanetResponse, Transformation, TransformationDetail } from '../models/character.model';

@Injectable({ providedIn: 'root' })
export class DragonballService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = 'https://dragonball-api.com/api';

  getCharacters(page: number = 1, limit: number = 12): Observable<CharacterResponse> {
    const params = new HttpParams().set('page', page).set('limit', limit);
    return this.http.get<CharacterResponse>(`${this.apiUrl}/characters`, { params });
  }

  getCharacterById(id: number): Observable<CharacterDetail> {
    return this.http.get<CharacterDetail>(`${this.apiUrl}/characters/${id}`);
  }
  getPlanets(page = 1, limit = 12): Observable<PlanetResponse> {
    const params = new HttpParams().set('page', page).set('limit', limit);
    return this.http.get<PlanetResponse>(`${this.apiUrl}/planets`, { params });
  }

  getPlanetById(id: number): Observable<PlanetDetail> {
    return this.http.get<PlanetDetail>(`${this.apiUrl}/planets/${id}`);
  }
  getTransformations(): Observable<Transformation[]> {
    return this.http.get<Transformation[]>(`${this.apiUrl}/transformations`);
  }

  getTransformationById(id: number): Observable<TransformationDetail> {
    return this.http.get<TransformationDetail>(`${this.apiUrl}/transformations/${id}`);
  }
}
