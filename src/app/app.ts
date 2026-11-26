import { Component, HostListener, OnInit, computed, inject, signal } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { forkJoin, map, of, switchMap, Subscription } from 'rxjs';
import { DragonballService } from './services/dragonball.service';
import { Character, CharacterDetail, Planet, PlanetDetail, Transformation, TransformationDetail } from './models/character.model';

type Section = 'characters' | 'planets' | 'transformations';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit {
  private readonly dragonballService = inject(DragonballService);
  private readonly title = inject(Title);
  readonly pageSize = 12;
  readonly section = signal<Section>('characters');
  readonly planets = signal<Planet[]>([]);
  readonly planetsLoading = signal(false);
  readonly planetsError = signal('');
  private planetsLoaded = false;
  readonly planetSearch = signal('');
  readonly planetStatus = signal('');
  readonly filteredPlanets = computed(() => {
    const query = this.normalize(this.planetSearch());
    return this.planets().filter(planet =>
      (!query || this.normalize(planet.name).includes(query)) &&
      (!this.planetStatus() ||
        (this.planetStatus() === 'destroyed' && planet.isDestroyed === true) ||
        (this.planetStatus() === 'intact' && planet.isDestroyed === false))
    );
  });
  readonly selectedPlanet = signal<Planet | null>(null);
  readonly planetDetail = signal<PlanetDetail | null>(null);
  readonly planetDetailLoading = signal(false);
  readonly planetDetailError = signal('');
  private planetDetailRequest?: Subscription;

  private readonly sectionHashes: Record<Section, string> = {
    characters: '#personajes',
    planets: '#planetas',
    transformations: '#transformaciones'
  };

  navigate(event: MouseEvent, section: Section): void {
    // Conserva el comportamiento habitual de los enlaces en otra pestaña.
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.button !== 0) return;
    event.preventDefault();
    const hash = this.sectionHashes[section];
    if (window.location.hash !== hash) {
      window.history.pushState(window.history.state, '', hash);
    }
    this.activateSection(section);
    window.scrollTo({ top: 0, behavior: 'instant' });
  }

  @HostListener('window:popstate')
  @HostListener('window:hashchange')
  syncSectionFromUrl(): void {
    const hash = window.location.hash;
    const section: Section = hash === '#planetas' ? 'planets' :
      hash === '#transformaciones' ? 'transformations' : 'characters';
    const changed = this.section() !== section;
    this.activateSection(section);
    if (changed) requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  }

  private activateSection(section: Section): void {
    this.section.set(section);
    const label = section === 'characters' ? 'Personajes' : section === 'planets' ? 'Planetas' : 'Transformaciones';
    this.title.setTitle(`Dragon Ball Universe | ${label}`);
    if (section === 'planets' && !this.planetsLoaded && !this.planetsLoading()) this.loadPlanets();
    if (section === 'transformations' && !this.transformationsLoaded && !this.transformationsLoading()) this.loadTransformations();
  }

  readonly transformations = signal<Transformation[]>([]);
  readonly transformationsLoading = signal(false);
  readonly transformationsError = signal('');
  private transformationsLoaded = false;
  readonly transformationSearch = signal('');
  readonly transformationPage = signal(1);
  readonly filteredTransformations = computed(() => {
    const query = this.normalize(this.transformationSearch());
    return this.transformations().filter(form => !query || this.normalize(form.name).includes(query));
  });
  readonly transformationPages = computed(() => Math.max(1, Math.ceil(this.filteredTransformations().length / this.pageSize)));
  readonly visibleTransformations = computed(() => {
    const start = (this.transformationPage() - 1) * this.pageSize;
    return this.filteredTransformations().slice(start, start + this.pageSize);
  });
  readonly selectedTransformation = signal<Transformation | null>(null);
  readonly transformationDetail = signal<TransformationDetail | null>(null);
  readonly transformationDetailLoading = signal(false);
  readonly transformationDetailError = signal('');
  private transformationRequest?: Subscription;

  loadTransformations(): void {
    if (this.transformationsLoading()) return;
    this.transformationsLoading.set(true);
    this.transformationsError.set('');
    this.dragonballService.getTransformations().subscribe({
      next: items => {
        this.transformations.set([...new Map(items.map(item => [item.id, item])).values()]);
        this.transformationsLoaded = true;
        this.transformationPage.set(1);
        this.transformationsLoading.set(false);
      },
      error: () => {
        this.transformationsError.set('No fue posible cargar las transformaciones. Comprueba tu conexión e inténtalo nuevamente.');
        this.transformationsLoading.set(false);
      }
    });
  }

  setTransformationSearch(value: string): void {
    this.transformationSearch.set(value);
    this.transformationPage.set(1);
  }

  changeTransformationPage(delta: number): void {
    const next = this.transformationPage() + delta;
    if (next >= 1 && next <= this.transformationPages()) this.transformationPage.set(next);
  }

  openTransformation(form: Transformation, dialog: HTMLDialogElement): void {
    this.selectedTransformation.set(form);
    this.loadTransformationDetail(form.id);
    if (!dialog.open) dialog.showModal();
    dialog.scrollTop = 0;
  }

  loadTransformationDetail(id: number): void {
    this.transformationRequest?.unsubscribe();
    this.transformationDetail.set(null);
    this.transformationDetailError.set('');
    this.transformationDetailLoading.set(true);
    this.transformationRequest = this.dragonballService.getTransformationById(id).subscribe({
      next: data => {
        this.transformationDetail.set(data);
        this.transformationDetailLoading.set(false);
      },
      error: () => {
        this.transformationDetailError.set('No fue posible obtener información adicional de esta transformación.');
        this.transformationDetailLoading.set(false);
      }
    });
  }

  clearTransformationDetail(dialog: HTMLDialogElement): void {
    if (dialog.open) return;
    this.transformationRequest?.unsubscribe();
    this.selectedTransformation.set(null);
    this.transformationDetail.set(null);
    this.transformationDetailError.set('');
    this.transformationDetailLoading.set(false);
  }

  loadPlanets(): void {
    if (this.planetsLoading()) return;
    this.planetsLoading.set(true);
    this.planetsError.set('');
    this.dragonballService.getPlanets(1, this.pageSize).pipe(
      switchMap(first => {
        if (first.meta.totalPages <= 1) return of(first.items);
        return forkJoin(Array.from({ length: first.meta.totalPages - 1 }, (_, i) =>
          this.dragonballService.getPlanets(i + 2, this.pageSize)
        )).pipe(map(rest => [first.items, ...rest.map(response => response.items)].flat()));
      }),
      map(items => [...new Map(items.map(item => [item.id, item])).values()])
    ).subscribe({
      next: items => {
        this.planets.set(items);
        this.planetsLoaded = true;
        this.planetsLoading.set(false);
      },
      error: () => {
        this.planetsError.set('No fue posible cargar los planetas. Comprueba tu conexión e inténtalo nuevamente.');
        this.planetsLoading.set(false);
      }
    });
  }

  clearPlanetFilters(): void {
    this.planetSearch.set('');
    this.planetStatus.set('');
  }

  openPlanet(planet: Planet, dialog: HTMLDialogElement): void {
    this.selectedPlanet.set(planet);
    this.loadPlanetDetail(planet.id);
    if (!dialog.open) dialog.showModal();
    dialog.scrollTop = 0;
  }

  loadPlanetDetail(id: number): void {
    this.planetDetailRequest?.unsubscribe();
    this.planetDetail.set(null);
    this.planetDetailError.set('');
    this.planetDetailLoading.set(true);
    this.planetDetailRequest = this.dragonballService.getPlanetById(id).subscribe({
      next: data => {
        this.planetDetail.set(data);
        this.planetDetailLoading.set(false);
      },
      error: () => {
        this.planetDetailError.set('No fue posible cargar la ficha del planeta. Comprueba tu conexión.');
        this.planetDetailLoading.set(false);
      }
    });
  }

  clearPlanetDetail(dialog: HTMLDialogElement): void {
    if (dialog.open) return;
    this.planetDetailRequest?.unsubscribe();
    this.selectedPlanet.set(null);
    this.planetDetail.set(null);
    this.planetDetailError.set('');
    this.planetDetailLoading.set(false);
  }

  private detailRequest?: Subscription;
  readonly selectedCharacter = signal<Character | null>(null);
  readonly detail = signal<CharacterDetail | null>(null);
  readonly detailLoading = signal(false);
  readonly detailError = signal('');

  openCharacter(character: Character, dialog: HTMLDialogElement): void {
    this.selectedCharacter.set(character);
    this.loadDetail(character.id);
    if (!dialog.open) dialog.showModal();
    dialog.scrollTop = 0;
  }

  loadDetail(id: number): void {
    this.detailRequest?.unsubscribe();
    this.detail.set(null);
    this.detailError.set('');
    this.detailLoading.set(true);
    this.detailRequest = this.dragonballService.getCharacterById(id).subscribe({
      next: data => {
        this.detail.set(data);
        this.detailLoading.set(false);
      },
      error: () => {
        this.detailError.set('No fue posible cargar la ficha. Comprueba tu conexión e inténtalo nuevamente.');
        this.detailLoading.set(false);
      }
    });
  }

  closeCharacter(dialog: HTMLDialogElement): void {
    dialog.close();
  }

  clearDetail(dialog: HTMLDialogElement): void {
    if (dialog.open) return;
    this.detailRequest?.unsubscribe();
    this.selectedCharacter.set(null);
    this.detail.set(null);
    this.detailError.set('');
    this.detailLoading.set(false);
  }


  readonly characters = signal<Character[]>([]);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly currentPage = signal(1);
  readonly search = signal('');
  readonly race = signal('');
  readonly gender = signal('');
  readonly affiliation = signal('');

  readonly totalCharacters = computed(() => this.characters().length);
  readonly races = computed(() => this.options('race'));
  readonly genders = computed(() => this.options('gender'));
  readonly affiliations = computed(() => this.options('affiliation'));

  readonly filteredCharacters = computed(() => {
    const query = this.normalize(this.search());
    return this.characters().filter(character =>
      (!query || this.normalize(character.name).includes(query)) &&
      (!this.race() || character.race === this.race()) &&
      (!this.gender() || character.gender === this.gender()) &&
      (!this.affiliation() || character.affiliation === this.affiliation())
    );
  });

  readonly resultCount = computed(() => this.filteredCharacters().length);
  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.resultCount() / this.pageSize)));
  readonly visibleCharacters = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize;
    return this.filteredCharacters().slice(start, start + this.pageSize);
  });
  readonly firstResult = computed(() => this.resultCount() ? (this.currentPage() - 1) * this.pageSize + 1 : 0);
  readonly lastResult = computed(() => Math.min(this.currentPage() * this.pageSize, this.resultCount()));
  readonly hasFilters = computed(() => Boolean(this.search() || this.race() || this.gender() || this.affiliation()));

  ngOnInit(): void {
    this.syncSectionFromUrl();
    this.loadCharacters();
  }

  loadCharacters(): void {
    this.loading.set(true);
    this.error.set('');
    this.currentPage.set(1);
    this.characters.set([]);

    // Se consultan todas las páginas de la API; no hay personajes estáticos.
    this.dragonballService.getCharacters(1, this.pageSize).pipe(
      switchMap(first => {
        const pages = first.meta.totalPages;
        if (pages <= 1) return of(first.items);
        const requests = Array.from({ length: pages - 1 }, (_, index) =>
          this.dragonballService.getCharacters(index + 2, this.pageSize)
        );
        return forkJoin(requests).pipe(
          map(rest => [first.items, ...rest.map(response => response.items)].flat())
        );
      }),
      map(items => [...new Map(items.map(item => [item.id, item])).values()])
    ).subscribe({
      next: items => {
        this.characters.set(items);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('No fue posible cargar el catálogo. Comprueba tu conexión e inténtalo nuevamente.');
        this.loading.set(false);
      }
    });
  }

  setSearch(value: string): void {
    this.search.set(value);
    this.currentPage.set(1);
  }

  setRace(value: string): void {
    this.race.set(value);
    this.currentPage.set(1);
  }

  setGender(value: string): void {
    this.gender.set(value);
    this.currentPage.set(1);
  }

  setAffiliation(value: string): void {
    this.affiliation.set(value);
    this.currentPage.set(1);
  }

  clearFilters(): void {
    this.search.set('');
    this.race.set('');
    this.gender.set('');
    this.affiliation.set('');
    this.currentPage.set(1);
  }

  nextPage(): void {
    if (!this.loading() && this.currentPage() < this.totalPages()) {
      this.currentPage.update(page => page + 1);
    }
  }

  previousPage(): void {
    if (!this.loading() && this.currentPage() > 1) {
      this.currentPage.update(page => page - 1);
    }
  }

  private options(field: 'race' | 'gender' | 'affiliation'): string[] {
    return [...new Set(this.characters().map(character => character[field]).filter(Boolean))]
      .sort((a, b) => a.localeCompare(b, 'es'));
  }

  private normalize(value: string): string {
    return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  }
}
