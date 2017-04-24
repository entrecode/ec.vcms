import { forwardRef, NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { VcmsComponent } from './vcms.component';
import { CommonModule } from '@angular/common';
import { VcmsToolbarComponent } from './vcms.toolbar.component';
import { BrowserModule } from '@angular/platform-browser';
import { UpgradeAdapter } from '@angular/upgrade';
declare const angular: any;

@NgModule({
  declarations: [
    VcmsToolbarComponent,
    VcmsComponent,
  ],
  imports: [
    BrowserModule,
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

if (angular) {
  const adapter = new UpgradeAdapter(forwardRef(() => VcmsModule));
  angular.module('ec.vcms', [])
  .directive('ecVcms', adapter.downgradeNg2Component(VcmsComponent))
  .directive('ecVcmsToolbar', adapter.downgradeNg2Component(VcmsToolbarComponent));

  adapter.bootstrap(document.getElementById('old'), ['ec.vcms']);
}
