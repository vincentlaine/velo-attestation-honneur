import { saveAs } from 'file-saver';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { from, ObservableInput } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { ProfilePublicFormInterface } from '../shared/interfaces/ProfilePublicForm.interface';
import { certFilename } from '../shared/helpers/certFilename.helper';

@Injectable({
  providedIn: 'root',
})
export class PdfPublicGeneratorService {
  constructor(private http: HttpClient) {
  }

  generate(data: ProfilePublicFormInterface,
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
      .get('/assets/certificate_public.pdf', {responseType: 'arraybuffer'})
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
          const draw = ((p, f) => (text, x, y, size = 11) => {
            p.drawText(text, {
              x,
              y,
              size,
              font: f,
              color: rgb(0, 0, 0),
            });
          })(page, font);

          draw(data.name, 420, 494);
          draw(data.days.toString(), 405, 290);
          draw(data.year.toString(), 517, 290);
          draw(data.location, 385, 163);

          const now = new Date();
          draw(
            `${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear()}`,
            385,
            150
          );

          draw(data.name, 79, 482, 10);
          page.drawText(data.ministry, {
            font,
            x: 79,
            y: 456,
            size: 10,
            color: rgb(0, 0, 0),
            maxWidth: 256,
            lineHeight: 13,
          });
          draw(data.rank, 79, 417, 10);

          page.drawText(data.home_address, {
            font,
            x: 79,
            y: 391,
            size: 10,
            color: rgb(0, 0, 0),
            maxWidth: 256,
            lineHeight: 13,
          });

          page.drawText(data.work_address, {
            font,
            x: 79,
            y: 352,
            size: 10,
            color: rgb(0, 0, 0),
            maxWidth: 256,
            lineHeight: 13,
          });

          // yes / no check
          if (data.mobility !== 'no') {
            draw('x', 94, 284);
            draw(data.mobility_date, 230, 284, 10);
          } else {
            draw('x', 94, 271);
          }

          // set metadata
          doc.setTitle('Attestation sur l\'honneur de déplacement en vélo');
          doc.setSubject('Attestation sur l\'honneur de déplacement en vélo');
          doc.setKeywords(['attestation', 'vélo']);
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
