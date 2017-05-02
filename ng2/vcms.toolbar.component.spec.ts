import { async, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { VcmsModule } from './vcms.module';
import { VcmsToolbarComponent } from './vcms.toolbar.component';

describe('VcmsToolbarComponent', () => {
  beforeEach(async(() => {
    TestBed.configureTestingModule({
      imports: [
        VcmsModule,
        CommonModule,
        FormsModule,
      ]
    }).compileComponents();
    this.fixture = TestBed.createComponent(VcmsToolbarComponent);
    this.vcmsToolbar = this.fixture.debugElement.componentInstance;

  }));

  it('should create the vcms toolbar', async(() => {
    expect(this.vcmsToolbar).toBeTruthy();
  }));

});
