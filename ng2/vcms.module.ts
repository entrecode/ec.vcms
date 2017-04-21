import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { VcmsComponent } from './vcms.component';
import { CommonModule } from '@angular/common';
import { VcmsToolbarComponent } from './vcms.toolbar.component';

@NgModule({
  declarations: [
    VcmsToolbarComponent,
    VcmsComponent,
  ],
  imports: [
    CommonModule,
    FormsModule,
  ],
  exports: [
    VcmsToolbarComponent,
    VcmsComponent,
  ],
})
export class VcmsModule {
}
