import { Subject } from 'rxjs';
import {
  tap,
  debounceTime,
  distinctUntilChanged,
  filter,
  switchMap,
} from 'rxjs/operators';
import {
  OnInit,
  Component,
  ChangeDetectorRef,
  ChangeDetectionStrategy,
  HostListener,
  ViewChild,
  ElementRef,
  forwardRef,
} from '@angular/core';
import {
  FormControl,
  ControlValueAccessor,
  NG_VALUE_ACCESSOR,
} from '@angular/forms';
import { AddressService } from 'src/app/services/address.service';

@Component({
  selector: 'app-ac-address',
  templateUrl: './autocomplete.component.html',
  styleUrls: ['./autocomplete.component.scss'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => AutocompleteFormComponent),
      multi: true,
    },
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AutocompleteFormComponent implements OnInit, ControlValueAccessor {
  @ViewChild('autocomplete', {static: true}) autocomplete: ElementRef<any>;

  items: Array<string> = [];
  search = new FormControl();
  open = false;
  disabled = false;
  loading = false;
  result = new Subject<string | null>();

  constructor(
    private service: AddressService,
    private ref: ChangeDetectorRef
  ) {
  }

  ngOnInit(): void {
    this.search.valueChanges
      .pipe(
        debounceTime(250),
        distinctUntilChanged(),
        // reset value to null if empty
        tap((v) => {
          if (v.trim() === '') {
            this.writeValue(null);
          }
        }),

        // filter out empty strings to avoid search nothing
        filter((v) => v.trim().length > 1),
        tap(() => {
          this.loading = true;
          this.ref.markForCheck();
        }),
        switchMap((s: string) => this.service.search(s))
      )
      .subscribe((items) => {
        this.items = items;
        this.open = true;
        this.loading = false;
        this.ref.markForCheck();
      });
  }

  private onTouch = () => {
  }

  // hide the dropdown when clicks anywhere else
  @HostListener('document:click', ['$event.target'])
  public onClick(targetElement): void {
    const clickedInside = this.autocomplete.nativeElement.contains(
      targetElement
    );
    if (!clickedInside) {
      this.closeDropdown();
      this.onTouch();
    }
  }

  @HostListener('blur')
  public onTouched(): void {
    this.closeDropdown();
    this.onTouch();
  }

  writeValue(val: string): void {
    this.result.next(val);
    this.search.setValue(val, {emitEvent: false});
    this.onTouch();
    this.closeDropdown();
  }

  registerOnChange(fn: any): void {
    this.result.subscribe(fn);
  }

  registerOnTouched(fn: any): void {
    this.onTouch = fn;
  }

  setDisabledState?(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  onItemClick(item: string): void {
    if (!this.disabled) {
      this.writeValue(item);
    }
  }

  toggleDropdown(): void {
    if (!this.disabled) {
      this.open = !this.open;
    }
  }

  closeDropdown(): void {
    this.open = false;
  }
}
