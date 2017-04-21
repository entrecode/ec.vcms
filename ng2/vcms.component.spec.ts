import { async, TestBed } from '@angular/core/testing';

import { VcmsComponent } from './vcms.component';

describe('VcmsComponent', () => {
  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [
        VcmsComponent
      ],
    }).compileComponents();
  }));

  it('should create the vcms', async(() => {
    const fixture = TestBed.createComponent(VcmsComponent);
    const vcms = fixture.debugElement.componentInstance;
    expect(vcms).toBeTruthy();
  }));

});
