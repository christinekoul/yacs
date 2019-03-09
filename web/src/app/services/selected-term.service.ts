import {Injectable} from '@angular/core';
import {Term} from 'yacs-api-client';
import {Subject, Subscription} from 'rxjs';

@Injectable()
export class SelectedTermService {
    // a subject that can be written to and subscribed to for the selected term
    public selectedTerm$: Subject<Term>;
    // hold the terms in two forms: a mapping between the uuid and the term, and an array for ordering
    protected terms: Map<string, Term>;
    protected termsOrdinal: Term[];
    // cache the current ordinal and uuid
    protected _currentOrdinal: number;
    protected _currentUUID: string;
    protected _currentId: string;

    constructor() {
        this.terms = new Map<string, Term>();
        this.termsOrdinal = new Array<Term>();
        this.selectedTerm$ = new Subject<Term>();
        this._currentOrdinal = 0;
        // acquire all the terms upon load
        Term.all().then(terms => {
            terms.data.forEach(term => {
                // place the terms in the map and the array
                this.terms.set(term.uuid, term);
                this.termsOrdinal.push(term);
            });
            if (localStorage['atFirstTerm'] === 'true') {
                // if the local storage term was the first term (the most recent)
                // set the selected term to the most recent instead of restoring
                // the last setting, which may unnecessarily obfuscate the most
                // recent term
                this.setSelectedTermByOrdinal(0);
            } else {
                // otherwise restore the selectedTerm from localStorage, verifying its validity
                // and defaulting to the most recent
                if (localStorage['selectedTerm'] !== undefined) {
                    const localTerm = this.terms.get(localStorage['selectedTerm']);
                    if (localTerm === undefined) {
                        this.setSelectedTermByOrdinal(0);
                    } else {
                        this._currentUUID = localTerm.uuid;
                        this._currentId = localTerm.id;
                        this.setSelectedTerm(localTerm.uuid);
                    }
                } else {
                    this.setSelectedTermByOrdinal(0);
                }
            }
        });
        // internal subscription to term for localstorage
        this.subscribeToTerm((term: Term) => {
            this._currentId = term.id;
            this._currentUUID = term.uuid;
            localStorage.setItem('selectedTerm', term.uuid);
            localStorage.setItem('atFirstTerm', `${this._currentOrdinal === 0}`);
        });
    }

    /**
     * Set the selected term by UUID
     * @param uuid
     * @return The success of setting the term (returns false if the UUID was invalid)
     */
    public setSelectedTerm(uuid: string): boolean {
        const nTerm = this.terms.get(uuid);
        if (nTerm !== undefined) {
            this._currentOrdinal = this.termsOrdinal.findIndex((term) => term.uuid === uuid);
            this.selectedTerm$.next(nTerm);
            return true;
        }
        return false;
    }

    /**
     * Sets the selected term by its ordinal
     * @param newOrdinal
     * @return The success of setting the term (returns false if the ordinal was out of bounds)
     */
    public setSelectedTermByOrdinal(newOrdinal: number): boolean {
        if (newOrdinal >= 0 && newOrdinal < this.termsOrdinal.length) {
            this._currentOrdinal = newOrdinal;
            this.selectedTerm$.next(this.termsOrdinal[newOrdinal]);
            return true;
        }
        return false;
    }

    /**
     * Attaches a subscriber to the selectedTerm, piping errors to console.error.
     * @param func
     */
    public subscribeToTerm(func: (Term) => void): Subscription {
        return this.selectedTerm$.subscribe(func, (e) => { console.error(e); }, () => {});
    }

    public get currentOrdinal(): number { return this._currentOrdinal; }
    public get maximumOrdinal(): number { return this.termsOrdinal.length - 1; }
    public get currentUUID(): string { return this._currentUUID; }
    public get currentTermId(): string { return this._currentId; }

    // for the future perhaps
    public getTerms(): Map<string, Term> { return this.terms; }

}
