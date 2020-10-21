import { Component, OnInit } from '@angular/core';
import { FormGroup, FormControl, Validators } from '@angular/forms';
import { debounceTime, distinctUntilChanged, filter } from 'rxjs/operators';
import { CounterService } from 'src/app/services/counter.service';
import { AddressService } from '../../services/address.service';
import { CompanyService } from '../../services/company.service';
import { PdfLimitedGeneratorService } from '../../services/pdfLimited.service';

@Component({
  selector: 'app-form-limited',
  templateUrl: './form-limited.component.html',
  styleUrls: ['./form-limited.component.scss'],
})
export class FormLimitedComponent implements OnInit {
  // configure the form fields
  profileForm = new FormGroup({
    name: new FormControl('', [Validators.required, Validators.maxLength(128)]),
    address: new FormControl('', [
      Validators.required,
      Validators.maxLength(256),
    ]),
    employer: new FormControl('', [
      Validators.required,
      Validators.maxLength(128),
    ]),
    distance: new FormControl('', [
      Validators.max(100000),
      Validators.pattern(/^[0-9]{0,6}$/),
    ]),
    days: new FormControl('', [
      Validators.max(365),
      Validators.pattern(/^[0-9]{0,6}$/),
    ]),
    location: new FormControl('', [
      Validators.required,
      Validators.maxLength(128),
    ]),
  });

  constructor(
    protected addressService: AddressService,
    protected companyService: CompanyService,
    private pdf: PdfLimitedGeneratorService,
    private counter: CounterService
  ) {}

  ngOnInit(): void {
    // reload saved data in a crash free way
    try {
      const saved = localStorage.getItem('formLtd');
      if (saved) {
        this.profileForm.patchValue(JSON.parse(saved));
      }
    } catch (e) {
      localStorage.removeItem('formLtd');
    }

    // auto-save
    this.profileForm.valueChanges
      .pipe(
        debounceTime(250),
        distinctUntilChanged(),
        filter((o: object) => !!Object.values(o).filter((v) => !!v).length)
      )
      .subscribe((o: object) => {
        localStorage.setItem('formLtd', JSON.stringify(o));
      });
  }

  showError(fieldName: string, errorName: string) {
    return (
      this.profileForm.get(fieldName).dirty &&
      this.profileForm.get(fieldName).hasError(errorName)
    );
  }

  onFound(key: string, value: string): void {
    this.profileForm.get(key).setValue(value);
  }

  onReset(): void {
    this.profileForm.setErrors(null);
    localStorage.removeItem('formLtd');
  }

  async onSubmit() {
    this.pdf.generate(this.profileForm.value);
    this.counter.save(window.origin, 'limited');
  }
}
