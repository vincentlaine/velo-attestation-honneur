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
  ControlValueAccessor,
  FormControl,
  NG_VALUE_ACCESSOR,
} from '@angular/forms';
import { AddressService } from 'src/app/services/address.service';

@Component({
  selector: 'app-autocomplete',
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
  @ViewChild('autocomplete', { static: true }) autocomplete: ElementRef<any>;

  items: Array<string> = [];
  search = new FormControl();
  open = false;
  disabled = false;
  loading = false;

  constructor(
    private service: AddressService,
    private ref: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.search.valueChanges
      .pipe(
        debounceTime(250),
        distinctUntilChanged(),
        filter((v) => v.trim().length > 1),
        tap(() => (this.loading = true)),
        switchMap((s: string) => this.service.search(s)),
        tap(() => (this.loading = false))
      )
      .subscribe((items) => {
        this.items = items;
        this.open = true;
        this.ref.markForCheck();
      });
  }

  private onChange = (_: string) => {};
  private onTouch = () => {};

  @HostListener('document:click', ['$event.target'])
  public onClick(targetElement) {
    const clickedInside = this.autocomplete.nativeElement.contains(
      targetElement
    );
    if (!clickedInside) {
      this.closeDropdown();
      this.onTouch();
    }
  }

  @HostListener('blur')
  public onTouched() {
    this.closeDropdown();
    this.onTouch();
  }

  writeValue(item: string): void {
    this.onChange(item);
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouch = fn;
  }

  setDisabledState?(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  onItemClick(item: string) {
    if (!this.disabled) {
      console.log('click', item);
      this.search.setValue(item, { emitEvent: false });
      this.open = false;
      this.onChange(item);
    }
  }

  toggleDropdown() {
    if (!this.disabled) {
      this.open = !this.open;
    }
  }

  closeDropdown() {
    this.open = false;
  }
}
