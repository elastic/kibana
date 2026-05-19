import type { Observable } from 'rxjs';
import type { NavigationSection } from '../page_template';
export interface NavigationRegistry {
    registerSections: (sections$: Observable<NavigationSection[]>) => void;
    sections$: Observable<NavigationSection[]>;
}
export declare const createNavigationRegistry: () => NavigationRegistry;
