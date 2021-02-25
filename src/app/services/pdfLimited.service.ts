import { saveAs } from 'file-saver';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { from, ObservableInput } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { ProfileLimitedFormInterface } from '../shared/interfaces/ProfileLimitedForm.interface';
import { certFilename } from '../shared/helpers/certFilename.helper';

@Injectable({
  providedIn: 'root',
})
export class PdfLimitedGeneratorService {
  constructor(private http: HttpClient) {
  }

  generate(data: ProfileLimitedFormInterface,
           obs?: { onComplete?: any; onError?: any }): void {
    const observer = {
      next: (pdfBytes) => {
        saveAs(
          new Blob([pdfBytes], {type: 'application/pdf'}),
          certFilename(data.name)
        );
      },
    };

    if (obs.onError) {
      observer['error'] = obs.onError;
    }
    if (obs.onComplete) {
      observer['complete'] = obs.onComplete;
    }

    this.http
      .get('/assets/certificate_ltd.pdf', {responseType: 'arraybuffer'})
      .pipe(
        catchError(this._handleError),

        // convert the PDF load document to an observable
        switchMap((pdfBuffer: ArrayBuffer) =>
          from(PDFDocument.load(pdfBuffer))
        ),

        // embed the font (Promise) and draw all text boxes
        // doc.save returns a Promise with a ArrayBuffer
        switchMap(async (doc: PDFDocument) => {
          const font = await doc.embedFont(StandardFonts.HelveticaBold);
          const page = doc.getPage(0);
          const draw = ((p, f) => (text, x, y) => {
            p.drawText(text, {
              x,
              y,
              size: 11,
              font: f,
              color: rgb(0, 0, 0),
            });
          })(page, font);

          draw(data.name, 80, 650);
          draw(data.address, 140, 620);
          draw(data.employer, 140, 589);

          // tick checkbox and set value
          // or mask the whole line
          if (data.distance) {
            draw('x', 128, 446.5);
            draw(data.distance.toString(), 418, 447);
          } else {
            page.drawRectangle({
              x: 125,
              y: 442,
              width: 400,
              height: 18,
              color: rgb(1, 1, 1),
            });
          }

          // tick checkbox and set value
          // or mask the whole line
          if (data.days) {
            draw(data.days.toString(), 225, 426);
            draw('x', 128, 426);
          } else {
            page.drawRectangle({
              x: 125,
              y: 422,
              width: 400,
              height: 18,
              color: rgb(1, 1, 1),
            });
          }

          // hide the whole section when no data
          if (!data.distance && !data.days) {
            page.drawRectangle({
              x: 70,
              y: 470,
              width: 140,
              height: 18,
              color: rgb(1, 1, 1),
            });
          }

          draw(data.location, 120, 284);

          const now = new Date();
          draw(
            `${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear()}`,
            120,
            263
          );

          // set metadata
          doc.setTitle('Attestation sur l\'honneur de déplacement en vélo');
          doc.setSubject('Attestation sur l\'honneur de déplacement en vélo');
          doc.setKeywords(['attestation', 'vélo', 'cycle']);
          doc.setProducer('beta.gouv');
          doc.setCreator('');
          doc.setAuthor('Ministère de la Transition écologique');

          return doc.save();
        })
      )
      .subscribe(observer);
  }

  private _handleError(err): ObservableInput<any> {
    console.error(err);
    return err;
  }
}
