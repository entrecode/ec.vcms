import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpModule } from '@angular/http';

import { VcmsComponent } from './vcms.component';
import { AppComponent } from './app.component';
import { CommonModule } from '@angular/common';
import { VcmsToolbarComponent } from './vcms.toolbar.component';

@NgModule({
  declarations: [
    VcmsToolbarComponent,
    VcmsComponent,
  ],
  imports: [
    CommonModule,
    BrowserModule,
    FormsModule,
  ],
  exports: [
    VcmsToolbarComponent,
    VcmsComponent,
  ],
})
export class VcmsModule { }
