import { async, TestBed } from '@angular/core/testing';

import { VcmsComponent } from './vcms.component';
import { VcmsToolbarComponent } from './vcms.toolbar.component';

describe('VcmsToolbarComponent', () => {
  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [
        VcmsToolbarComponent
      ],
    }).compileComponents();
  }));

  it('should create the vcms toolbar', async(() => {
    const fixture = TestBed.createComponent(VcmsComponent);
    const vcmsToolbar = fixture.debugElement.componentInstance;
    expect(vcmsToolbar).toBeTruthy();
  }));

});
