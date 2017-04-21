import { async, TestBed } from '@angular/core/testing';

import { VcmsComponent } from './vcms.component';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { VcmsModule } from './vcms.module';

describe('VcmsComponent', () => {
  beforeEach(async(() => {
    TestBed.configureTestingModule({
      imports: [
        VcmsModule,
        CommonModule,
        FormsModule,
      ]
    }).compileComponents();
    this.fixture = TestBed.createComponent(VcmsComponent);
    this.vcms = this.fixture.debugElement.componentInstance;

  }));

  it('should create the vcms', async(() => {
    expect(this.vcms).toBeTruthy();
  }));

});
